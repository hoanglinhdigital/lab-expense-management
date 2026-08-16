/**
 * Nguồn tiền và số dư (`docs/api-spec/account.yaml`).
 *
 * Công thức số dư — chỉ tính transaction `isDeleted = false`:
 *
 *   currentBalance = initialBalance
 *     + Σ amount (INCOME, BORROW)   có fromAccountId = account
 *     + Σ (receiveAmount ?? amount) của TRANSFER có toAccountId = account
 *     − Σ amount (EXPENSE, LEND)    có fromAccountId = account
 *     − Σ amount                    của TRANSFER có fromAccountId = account
 */

import { Prisma } from "@/generated/prisma/client";
import { AccountType, TransactionType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { accountNotFound, conflict, notFound } from "@/lib/api/errors";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_ORDER,
} from "@/lib/api/constants";
import {
  buildMeta,
  paginateArray,
  toSkipTake,
  type PaginationMeta,
} from "@/lib/api/pagination";
import {
  toAccountDto,
  type AccountDto,
} from "@/lib/api/serializers/account.serializer";
import { toAmountString, toDecimal, ZERO, type Decimal } from "@/lib/domain/decimal";
import { convert, loadRates } from "@/lib/domain/money";
import { assertCurrencySupported } from "./currency.service";
import type {
  CreateAccountInput,
  ListAccountsQuery,
  UpdateAccountInput,
} from "@/lib/api/schemas/account.schema";

/** Prisma client thường hoặc client bên trong `$transaction`. */
type Db = typeof prisma | Prisma.TransactionClient;

const accountSelect = {
  id: true,
  name: true,
  type: true,
  initialBalance: true,
  currency: true,
  icon: true,
  description: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface BalanceBreakdown {
  initialBalance: Decimal;
  totalIn: Decimal;
  totalOut: Decimal;
  currentBalance: Decimal;
}

/**
 * Tính số dư của nhiều account bằng số query cố định (3 truy vấn), không N+1
 * theo số account trong trang.
 */
export async function computeBalances(
  userId: string,
  options: { accountIds?: string[]; asOf?: Date } = {},
  db: Db = prisma,
): Promise<Map<string, BalanceBreakdown>> {
  const accounts = await db.account.findMany({
    where: {
      userId,
      isDeleted: false,
      ...(options.accountIds ? { id: { in: options.accountIds } } : {}),
    },
    select: { id: true, initialBalance: true },
  });

  const result = new Map<string, BalanceBreakdown>();
  for (const account of accounts) {
    result.set(account.id, {
      initialBalance: toDecimal(account.initialBalance),
      totalIn: ZERO,
      totalOut: ZERO,
      currentBalance: toDecimal(account.initialBalance),
    });
  }

  if (result.size === 0) return result;

  const ids = [...result.keys()];
  const dateFilter = options.asOf ? { date: { lte: options.asOf } } : {};
  const base = { userId, isDeleted: false, ...dateFilter };

  const [inFrom, outFrom, transfersIn] = await Promise.all([
    db.transaction.groupBy({
      by: ["fromAccountId"],
      where: {
        ...base,
        fromAccountId: { in: ids },
        type: { in: [TransactionType.INCOME, TransactionType.BORROW] },
      },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["fromAccountId"],
      where: {
        ...base,
        fromAccountId: { in: ids },
        type: {
          in: [
            TransactionType.EXPENSE,
            TransactionType.LEND,
            TransactionType.TRANSFER,
          ],
        },
      },
      _sum: { amount: true },
    }),
    // Tiền vào của TRANSFER là `receiveAmount ?? amount` nên không gộp được
    // vào groupBy — phải đọc từng dòng rồi cộng ở tầng ứng dụng.
    db.transaction.findMany({
      where: {
        ...base,
        toAccountId: { in: ids },
        type: TransactionType.TRANSFER,
      },
      select: { toAccountId: true, amount: true, receiveAmount: true },
    }),
  ]);

  for (const row of inFrom) {
    const entry = result.get(row.fromAccountId);
    if (entry) entry.totalIn = entry.totalIn.add(toDecimal(row._sum.amount));
  }

  for (const row of outFrom) {
    const entry = result.get(row.fromAccountId);
    if (entry) entry.totalOut = entry.totalOut.add(toDecimal(row._sum.amount));
  }

  for (const row of transfersIn) {
    if (!row.toAccountId) continue;
    const entry = result.get(row.toAccountId);
    if (entry) {
      entry.totalIn = entry.totalIn.add(toDecimal(row.receiveAmount ?? row.amount));
    }
  }

  for (const entry of result.values()) {
    entry.currentBalance = entry.initialBalance.add(entry.totalIn).minus(entry.totalOut);
  }

  return result;
}

/**
 * Ghi lại cache `currentBalance`. Luôn tính lại từ đầu thay vì cộng/trừ tương
 * đối — cộng trừ tương đối sẽ tích luỹ sai lệch qua nhiều lần sửa giao dịch.
 */
export async function recomputeBalances(
  db: Db,
  userId: string,
  accountIds: (string | null | undefined)[],
): Promise<void> {
  const ids = [...new Set(accountIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return;

  const balances = await computeBalances(userId, { accountIds: ids }, db);

  for (const [accountId, balance] of balances) {
    await db.account.update({
      where: { id: accountId },
      data: { currentBalance: balance.currentBalance },
    });
  }
}

/** Tìm account của user, ném `404` nếu không tồn tại / đã xoá / của người khác. */
export async function getOwnedAccount(
  userId: string,
  accountId: string,
  db: Db = prisma,
) {
  const account = await db.account.findFirst({
    where: { id: accountId, userId, isDeleted: false },
    select: accountSelect,
  });

  if (!account) throw accountNotFound();
  return account;
}

export async function listAccounts(
  userId: string,
  query: ListAccountsQuery,
): Promise<{ data: AccountDto[]; meta: PaginationMeta }> {
  const where: Prisma.AccountWhereInput = {
    userId,
    isDeleted: false,
    ...(query.type ? { type: { in: query.type as AccountType[] } } : {}),
    ...(query.currency ? { currency: query.currency } : {}),
    ...(query.keyword ? { name: { contains: query.keyword } } : {}),
  };

  const total = await prisma.account.count({ where });

  // `balance_*` là giá trị tính toán, DB không sort được. Số nguồn tiền của một
  // user chỉ ở mức vài chục nên nạp hết rồi sort trong bộ nhớ là chấp nhận được.
  if (query.sort === "balance_asc" || query.sort === "balance_desc") {
    const accounts = await prisma.account.findMany({ where, select: accountSelect });
    const balances = await computeBalances(userId, {
      accountIds: accounts.map((account) => account.id),
    });

    const direction = query.sort === "balance_asc" ? 1 : -1;
    const sorted = [...accounts].sort((a, b) => {
      const balanceA = balances.get(a.id)?.currentBalance ?? ZERO;
      const balanceB = balances.get(b.id)?.currentBalance ?? ZERO;
      return balanceA.comparedTo(balanceB) * direction;
    });

    return {
      data: paginateArray(sorted, query).map((account) =>
        toAccountDto(account, balances.get(account.id)?.currentBalance ?? ZERO),
      ),
      meta: buildMeta(query, total),
    };
  }

  const accounts = await prisma.account.findMany({
    where,
    select: accountSelect,
    orderBy: toOrderBy(query.sort),
    ...toSkipTake(query),
  });

  const balances = await computeBalances(userId, {
    accountIds: accounts.map((account) => account.id),
  });

  return {
    data: accounts.map((account) =>
      toAccountDto(account, balances.get(account.id)?.currentBalance ?? ZERO),
    ),
    meta: buildMeta(query, total),
  };
}

function toOrderBy(sort: ListAccountsQuery["sort"]): Prisma.AccountOrderByWithRelationInput[] {
  switch (sort) {
    case "name_asc":
      return [{ name: "asc" }, { id: "asc" }];
    case "name_desc":
      return [{ name: "desc" }, { id: "asc" }];
    case "created_asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    default:
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}

export async function createAccount(
  userId: string,
  input: CreateAccountInput,
): Promise<AccountDto> {
  await assertCurrencySupported(input.currency, "currency");

  const duplicated = await prisma.account.findFirst({
    where: { userId, name: input.name, isDeleted: false },
    select: { id: true },
  });
  if (duplicated) throw accountNameDuplicated(input.name);

  const initialBalance = toDecimal(input.initialBalance);

  try {
    const account = await prisma.$transaction(async (tx) => {
      if (input.isDefault) await clearDefaultFlag(tx, userId);

      return tx.account.create({
        data: {
          userId,
          name: input.name,
          type: input.type as AccountType,
          initialBalance,
          // Account mới chưa có giao dịch nên số dư hiện tại bằng số dư khởi tạo.
          currentBalance: initialBalance,
          currency: input.currency,
          icon: input.icon ?? null,
          description: input.description ?? null,
          isDefault: input.isDefault,
        },
        select: accountSelect,
      });
    });

    return toAccountDto(account, initialBalance);
  } catch (error) {
    // Unique `[userId, name]` tính cả account đã xoá mềm, nên vẫn có thể vướng.
    if (isUniqueViolation(error)) throw accountNameDuplicated(input.name);
    throw error;
  }
}

export async function getAccount(
  userId: string,
  accountId: string,
): Promise<AccountDto> {
  const account = await getOwnedAccount(userId, accountId);
  const balances = await computeBalances(userId, { accountIds: [accountId] });
  return toAccountDto(account, balances.get(accountId)?.currentBalance ?? ZERO);
}

export async function updateAccount(
  userId: string,
  accountId: string,
  input: UpdateAccountInput,
): Promise<AccountDto> {
  const account = await getOwnedAccount(userId, accountId);

  if (input.currency && input.currency !== account.currency) {
    await assertCurrencySupported(input.currency, "currency");

    const transactionCount = await countAccountTransactions(userId, accountId);
    if (transactionCount > 0) {
      throw conflict(
        "ACCOUNT_CURRENCY_LOCKED",
        "Không thể đổi tiền tệ của nguồn tiền đang có giao dịch.",
        { transactionCount },
      );
    }
  }

  if (input.name && input.name !== account.name) {
    const duplicated = await prisma.account.findFirst({
      where: { userId, name: input.name, isDeleted: false, id: { not: accountId } },
      select: { id: true },
    });
    if (duplicated) throw accountNameDuplicated(input.name);
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (input.isDefault === true) await clearDefaultFlag(tx, userId, accountId);

      await tx.account.update({
        where: { id: accountId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.type !== undefined ? { type: input.type as AccountType } : {}),
          ...(input.initialBalance !== undefined
            ? { initialBalance: toDecimal(input.initialBalance) }
            : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        },
      });

      // Đổi `initialBalance` làm số dư hiện tại dịch theo — cập nhật cache ngay.
      await recomputeBalances(tx, userId, [accountId]);
    });
  } catch (error) {
    if (isUniqueViolation(error) && input.name) throw accountNameDuplicated(input.name);
    throw error;
  }

  return getAccount(userId, accountId);
}

export async function deleteAccount(
  userId: string,
  accountId: string,
): Promise<void> {
  await getOwnedAccount(userId, accountId);

  const transactionCount = await countAccountTransactions(userId, accountId);
  if (transactionCount > 0) {
    throw conflict(
      "ACCOUNT_HAS_TRANSACTIONS",
      "Không thể xoá nguồn tiền đang có giao dịch.",
      { transactionCount },
    );
  }

  await prisma.account.update({
    where: { id: accountId },
    data: { isDeleted: true },
  });
}

export async function getAccountBalance(
  userId: string,
  accountId: string,
  asOf?: Date,
) {
  const account = await getOwnedAccount(userId, accountId);
  const effectiveAsOf = asOf ?? new Date();

  const balances = await computeBalances(userId, {
    accountIds: [accountId],
    asOf: effectiveAsOf,
  });
  const balance = balances.get(accountId);

  return {
    accountId,
    currency: account.currency,
    initialBalance: toAmountString(account.initialBalance),
    totalIn: toAmountString(balance?.totalIn ?? ZERO),
    totalOut: toAmountString(balance?.totalOut ?? ZERO),
    currentBalance: toAmountString(balance?.currentBalance ?? account.initialBalance),
    asOf: effectiveAsOf.toISOString(),
  };
}

export async function getAccountSummary(
  userId: string,
  defaultCurrency: string,
  requestedCurrency?: string,
) {
  const currency = requestedCurrency ?? defaultCurrency;
  await assertCurrencySupported(currency, "currency");

  const [accounts, rates] = await Promise.all([
    prisma.account.findMany({
      where: { userId, isDeleted: false },
      select: accountSelect,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    loadRates(currency),
  ]);

  const balances = await computeBalances(userId, {
    accountIds: accounts.map((account) => account.id),
  });

  const grouped = new Map<AccountType, { subtotal: Decimal; accounts: AccountDto[] }>();
  let totalBalance = ZERO;

  for (const account of accounts) {
    const balance = balances.get(account.id)?.currentBalance ?? ZERO;
    const converted = convert(balance, account.currency, currency, rates);

    totalBalance = totalBalance.add(converted);

    const group = grouped.get(account.type) ?? { subtotal: ZERO, accounts: [] };
    group.subtotal = group.subtotal.add(converted);
    group.accounts.push(toAccountDto(account, balance));
    grouped.set(account.type, group);
  }

  // Giữ thứ tự khai báo của enum, bỏ nhóm rỗng.
  const groups = ACCOUNT_TYPE_ORDER.filter((type) => grouped.has(type)).map((type) => {
    const group = grouped.get(type)!;
    return {
      type,
      label: ACCOUNT_TYPE_LABELS[type],
      subtotal: toAmountString(group.subtotal),
      accounts: group.accounts,
    };
  });

  return { totalBalance: toAmountString(totalBalance), currency, groups };
}

// --- Helper ------------------------------------------------------------------

/** Đếm giao dịch chưa xoá dùng account này — kể cả khi nó là `toAccountId`. */
async function countAccountTransactions(
  userId: string,
  accountId: string,
): Promise<number> {
  return prisma.transaction.count({
    where: {
      userId,
      isDeleted: false,
      OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
    },
  });
}

async function clearDefaultFlag(db: Db, userId: string, exceptId?: string) {
  await db.account.updateMany({
    where: {
      userId,
      isDefault: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { isDefault: false },
  });
}

function accountNameDuplicated(name: string) {
  return conflict(
    "ACCOUNT_NAME_DUPLICATED",
    "Bạn đã có nguồn tiền cùng tên.",
    { name },
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/** Dùng ở plan 07 — validate bộ lọc `accountId` của báo cáo. */
export async function assertAccountOwned(
  userId: string,
  accountId: string,
): Promise<void> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId, isDeleted: false },
    select: { id: true },
  });

  if (!account) {
    throw notFound(
      "NOT_FOUND",
      "Không tìm thấy dữ liệu dùng trong bộ lọc.",
      { accountId },
    );
  }
}
