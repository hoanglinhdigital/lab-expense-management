/**
 * Giao dịch (`docs/api-spec/transaction.yaml`).
 *
 * Một model phủ 5 loại nghiệp vụ. Ràng buộc field theo `type` đã được zod chặn ở
 * `transaction.schema.ts`; file này lo phần còn lại: kiểm tra tham chiếu thuộc về
 * user, quy tắc `receiveAmount`, và cập nhật số dư trong cùng `$transaction`.
 */

import { Prisma } from "@/generated/prisma/client";
import { TransactionType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  accountNotFound,
  conflict,
  contactNotFound,
  transactionNotFound,
  validationError,
} from "@/lib/api/errors";
import {
  buildMeta,
  toSkipTake,
  type PaginationMeta,
} from "@/lib/api/pagination";
import {
  toTransactionDto,
  transactionSelect,
  type TransactionDto,
} from "@/lib/api/serializers/transaction.serializer";
import { toAmountString, toDecimal, ZERO } from "@/lib/domain/decimal";
import { convert, loadRates } from "@/lib/domain/money";
import { recomputeBalances } from "./account.service";
import { expandCategoryIds } from "./category.service";
import type {
  ListTransactionsQuery,
  TransactionBodyInput,
} from "@/lib/api/schemas/transaction.schema";

interface ResolvedInput {
  type: TransactionType;
  amount: Prisma.Decimal;
  receiveAmount: Prisma.Decimal | null;
  date: Date;
  note: string | null;
  fromAccountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  contactId: string | null;
}

/**
 * Account phải thuộc user. Id tham chiếu không tồn tại / của người khác được coi
 * là dữ liệu đầu vào không hợp lệ → 400 (kèm `error.details.<field>`), gộp cả hai
 * để không lộ sự tồn tại tài nguyên. Tồn tại nhưng đã xoá mềm → 409.
 */
async function resolveAccount(userId: string, accountId: string, field: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true, currency: true, isDeleted: true },
  });

  if (!account) {
    throw validationError({ [field]: "Nguồn tiền không hợp lệ hoặc không tồn tại." });
  }
  if (account.isDeleted) {
    throw conflict(
      "ACCOUNT_DELETED",
      "Nguồn tiền đã bị xoá, vui lòng chọn nguồn tiền khác.",
      { [field]: accountId },
    );
  }

  return account;
}

/** Category phải đọc được (USER của mình hoặc SYSTEM) và khớp `type` giao dịch. */
async function resolveCategory(
  userId: string,
  categoryId: string,
  transactionType: TransactionType,
) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      OR: [{ scope: "SYSTEM" }, { userId }],
    },
    select: { id: true, type: true, isDeleted: true },
  });

  if (!category) {
    throw validationError({
      categoryId: "Danh mục không hợp lệ hoặc không tồn tại.",
    });
  }
  if (category.isDeleted) {
    throw conflict(
      "CATEGORY_DELETED",
      "Danh mục đã bị xoá, vui lòng chọn danh mục khác.",
      { categoryId },
    );
  }

  if (category.type !== transactionType) {
    throw validationError({
      categoryId:
        transactionType === TransactionType.EXPENSE
          ? "Giao dịch chi tiêu phải chọn danh mục loại EXPENSE."
          : "Giao dịch thu nhập phải chọn danh mục loại INCOME.",
    });
  }

  return category;
}

async function resolveContact(userId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
    select: { id: true, isDeleted: true },
  });

  if (!contact) throw contactNotFound();
  if (contact.isDeleted) {
    throw conflict(
      "CONTACT_DELETED",
      "Đối tượng đã bị xoá, vui lòng chọn đối tượng khác.",
      { contactId },
    );
  }

  return contact;
}

/** Kiểm tra toàn bộ tham chiếu theo đúng thứ tự from → to → category → contact. */
async function resolveInput(
  userId: string,
  input: TransactionBodyInput,
): Promise<ResolvedInput> {
  const fromAccount = await resolveAccount(
    userId,
    input.fromAccountId,
    "fromAccountId",
  );

  const resolved: ResolvedInput = {
    type: input.type as TransactionType,
    amount: toDecimal(input.amount),
    receiveAmount: null,
    date: input.date,
    note: input.note ?? null,
    fromAccountId: input.fromAccountId,
    toAccountId: null,
    categoryId: null,
    contactId: null,
  };

  if (input.type === "TRANSFER") {
    const toAccount = await resolveAccount(
      userId,
      input.toAccountId,
      "toAccountId",
    );
    resolved.toAccountId = toAccount.id;

    const sameCurrency = fromAccount.currency === toAccount.currency;
    const receiveAmount =
      input.receiveAmount === null || input.receiveAmount === undefined
        ? null
        : toDecimal(input.receiveAmount);

    if (!sameCurrency && receiveAmount === null) {
      throw validationError({
        receiveAmount:
          "Chuyển khoản giữa hai tiền tệ khác nhau phải nhập số tiền thực nhận.",
      });
    }

    // Cùng tiền tệ mà số nhận khác số gửi là dữ liệu sai, không phải tỷ giá.
    if (sameCurrency && receiveAmount !== null && !receiveAmount.equals(resolved.amount)) {
      throw validationError({
        receiveAmount:
          "Hai nguồn tiền cùng tiền tệ nên số tiền nhận phải bằng số tiền chuyển.",
      });
    }

    resolved.receiveAmount = sameCurrency ? null : receiveAmount;
  }

  if (input.type === "INCOME" || input.type === "EXPENSE") {
    const category = await resolveCategory(
      userId,
      input.categoryId,
      input.type as TransactionType,
    );
    resolved.categoryId = category.id;
  }

  if (input.type === "BORROW" || input.type === "LEND") {
    const contact = await resolveContact(userId, input.contactId);
    resolved.contactId = contact.id;
  }

  return resolved;
}

export async function createTransaction(
  userId: string,
  input: TransactionBodyInput,
): Promise<TransactionDto> {
  const resolved = await resolveInput(userId, input);

  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: { userId, ...resolved },
      select: transactionSelect,
    });

    await recomputeBalances(tx, userId, [
      resolved.fromAccountId,
      resolved.toAccountId,
    ]);

    return created;
  });

  return toTransactionDto(transaction);
}

export async function getTransaction(
  userId: string,
  transactionId: string,
): Promise<TransactionDto> {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, isDeleted: false },
    select: transactionSelect,
  });

  if (!transaction) throw transactionNotFound();
  return toTransactionDto(transaction);
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: TransactionBodyInput,
): Promise<TransactionDto> {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, isDeleted: false },
    select: { id: true, fromAccountId: true, toAccountId: true },
  });

  if (!existing) throw transactionNotFound();

  const resolved = await resolveInput(userId, input);

  const transaction = await prisma.$transaction(async (tx) => {
    const updated = await tx.transaction.update({
      where: { id: transactionId },
      data: resolved,
      select: transactionSelect,
    });

    // Tính lại số dư của cả account cũ lẫn mới — đổi `fromAccountId` phải hoàn
    // nguyên account cũ chứ không chỉ trừ account mới.
    await recomputeBalances(tx, userId, [
      existing.fromAccountId,
      existing.toAccountId,
      resolved.fromAccountId,
      resolved.toAccountId,
    ]);

    return updated;
  });

  return toTransactionDto(transaction);
}

export async function deleteTransaction(
  userId: string,
  transactionId: string,
): Promise<void> {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, isDeleted: false },
    select: { id: true, fromAccountId: true, toAccountId: true },
  });

  if (!existing) throw transactionNotFound();

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transactionId },
      data: { isDeleted: true },
    });

    await recomputeBalances(tx, userId, [
      existing.fromAccountId,
      existing.toAccountId,
    ]);
  });
}

// --- Danh sách ---------------------------------------------------------------

async function buildListWhere(
  userId: string,
  query: ListTransactionsQuery,
): Promise<Prisma.TransactionWhereInput> {
  const where: Prisma.TransactionWhereInput = { userId, isDeleted: false };
  const and: Prisma.TransactionWhereInput[] = [];

  if (query.dateFrom || query.dateTo) {
    where.date = {
      ...(query.dateFrom ? { gte: query.dateFrom } : {}),
      ...(query.dateTo ? { lte: query.dateTo } : {}),
    };
  }

  if (query.accountId) {
    // Account phải thuộc user, nếu không thì lộ dữ liệu qua bộ lọc.
    const account = await prisma.account.findFirst({
      where: { id: query.accountId, userId, isDeleted: false },
      select: { id: true },
    });
    if (!account) throw accountNotFound();

    // Khớp khi account là nguồn **hoặc** đích.
    and.push({
      OR: [
        { fromAccountId: query.accountId },
        { toAccountId: query.accountId },
      ],
    });
  }

  if (query.categoryId) {
    const categoryIds = query.includeChildCategories
      ? await expandCategoryIds(userId, query.categoryId)
      : [query.categoryId];
    where.categoryId = { in: categoryIds };
  }

  if (query.contactId) where.contactId = query.contactId;
  if (query.type) where.type = { in: query.type as TransactionType[] };
  if (query.keyword) where.note = { contains: query.keyword };

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    where.amount = {
      ...(query.minAmount !== undefined ? { gte: toDecimal(query.minAmount) } : {}),
      ...(query.maxAmount !== undefined ? { lte: toDecimal(query.maxAmount) } : {}),
    };
  }

  if (and.length > 0) where.AND = and;
  return where;
}

function toOrderBy(
  sort: ListTransactionsQuery["sort"],
): Prisma.TransactionOrderByWithRelationInput[] {
  // `id` làm khoá phụ để phân trang ổn định khi nhiều giao dịch trùng `date`.
  switch (sort) {
    case "date_asc":
      return [{ date: "asc" }, { id: "asc" }];
    case "amount_desc":
      return [{ amount: "desc" }, { id: "asc" }];
    case "amount_asc":
      return [{ amount: "asc" }, { id: "asc" }];
    case "created_desc":
      return [{ createdAt: "desc" }, { id: "asc" }];
    default:
      return [{ date: "desc" }, { id: "asc" }];
  }
}

/**
 * Tổng thu/chi của **toàn bộ** kết quả khớp bộ lọc (không chỉ trang hiện tại).
 * Chỉ INCOME và EXPENSE được tính — TRANSFER/BORROW/LEND không phải thu/chi.
 */
async function sumIncomeExpense(
  where: Prisma.TransactionWhereInput,
  userId: string,
  targetCurrency: string,
): Promise<{ totalIncome: string; totalExpense: string }> {
  const [rows, accounts, rates] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type", "fromAccountId"],
      where: {
        ...where,
        type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
      },
      _sum: { amount: true },
    }),
    prisma.account.findMany({
      where: { userId },
      select: { id: true, currency: true },
    }),
    loadRates(targetCurrency),
  ]);

  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));

  let income = ZERO;
  let expense = ZERO;

  for (const row of rows) {
    const currency = currencyOf.get(row.fromAccountId) ?? targetCurrency;
    const amount = convert(
      toDecimal(row._sum.amount),
      currency,
      targetCurrency,
      rates,
    );

    if (row.type === TransactionType.INCOME) income = income.add(amount);
    else expense = expense.add(amount);
  }

  return {
    totalIncome: toAmountString(income),
    totalExpense: toAmountString(expense),
  };
}

export async function listTransactions(
  userId: string,
  defaultCurrency: string,
  query: ListTransactionsQuery,
): Promise<{
  data: TransactionDto[];
  meta: PaginationMeta & {
    totalIncome: string;
    totalExpense: string;
    currency: string;
  };
}> {
  const where = await buildListWhere(userId, query);

  const [total, transactions, totals] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      select: transactionSelect,
      orderBy: toOrderBy(query.sort),
      ...toSkipTake(query),
    }),
    sumIncomeExpense(where, userId, defaultCurrency),
  ]);

  return {
    data: transactions.map(toTransactionDto),
    meta: { ...buildMeta(query, total), ...totals, currency: defaultCurrency },
  };
}
