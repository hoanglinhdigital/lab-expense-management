/**
 * Báo cáo tổng hợp (`docs/api-spec/report.yaml`).
 *
 * Quy ước áp dụng cho mọi endpoint ở đây:
 * - Chỉ `INCOME` là tiền vào, `EXPENSE` là tiền ra. `TRANSFER` bị loại khỏi mọi
 *   báo cáo thu/chi (chuyển tiền nội bộ không phải thu/chi). `BORROW`/`LEND`
 *   chỉ xuất hiện ở `/money-lend-borrow` và phần công nợ của `/overview`.
 * - Mốc ngày/tháng cắt theo `timezone` (giờ địa phương), không theo UTC.
 * - Mọi số tiền quy về một currency duy nhất, gom theo currency gốc rồi mới cộng.
 */

import { Prisma } from "@/generated/prisma/client";
import { TransactionType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/api/errors";
import {
  REPORT_PERIOD_LABELS,
  UNCATEGORIZED_LABEL,
  type ReportPeriodId,
} from "@/lib/api/constants";
import { buildMeta, toSkipTake } from "@/lib/api/pagination";
import {
  toAmountString,
  toDecimal,
  toPercentage,
  ZERO,
  type Decimal,
} from "@/lib/domain/decimal";
import {
  assertValidTimezone,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  formatMonthKey,
  lastMonthsRange,
  listMonthKeys,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "@/lib/domain/datetime";
import { convert, loadRates, type RateMap } from "@/lib/domain/money";
import { computeBalances } from "./account.service";
import { expandCategoryIds, loadRootCategoryMap } from "./category.service";
import { assertCurrencySupported } from "./currency.service";
import type {
  ExpenseAnalysisQuery,
  ExpenseByCategoryQuery,
  ExpenseVsIncomeQuery,
  MoneyLendBorrowQuery,
  ReportOverviewQuery,
  TotalBalanceQuery,
} from "@/lib/api/schemas/report.schema";

interface ReportContext {
  timezone: string;
  currency: string;
  rates: RateMap;
  /** `accountId → currency`, để quy đổi số tiền của từng giao dịch. */
  currencyOf: Map<string, string>;
}

interface PeriodRange {
  dateFrom: Date;
  dateTo: Date;
  timezone: string;
  currency: string;
}

async function resolveContext(
  userId: string,
  defaultCurrency: string,
  query: { timezone: string; currency?: string; accountId?: string },
): Promise<ReportContext> {
  const timezone = assertValidTimezone(query.timezone);
  const currency = query.currency ?? defaultCurrency;
  await assertCurrencySupported(currency, "currency");

  if (query.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: query.accountId, userId, isDeleted: false },
      select: { id: true },
    });
    if (!account) {
      throw notFound("NOT_FOUND", "Không tìm thấy dữ liệu dùng trong bộ lọc.", {
        accountId: query.accountId,
      });
    }
  }

  const [rates, accounts] = await Promise.all([
    loadRates(currency),
    prisma.account.findMany({ where: { userId }, select: { id: true, currency: true } }),
  ]);

  return {
    timezone,
    currency,
    rates,
    currencyOf: new Map(accounts.map((account) => [account.id, account.currency])),
  };
}

/** Kỳ mặc định: từ ngày 1 tới ngày cuối **tháng hiện tại** theo `timezone`. */
function resolvePeriod(
  query: { dateFrom?: Date; dateTo?: Date },
  context: ReportContext,
  now = new Date(),
): PeriodRange {
  return {
    dateFrom: query.dateFrom ?? startOfMonth(now, context.timezone),
    dateTo: query.dateTo ?? endOfMonth(now, context.timezone),
    timezone: context.timezone,
    currency: context.currency,
  };
}

function serializeRange(range: PeriodRange) {
  return {
    dateFrom: range.dateFrom.toISOString(),
    dateTo: range.dateTo.toISOString(),
    timezone: range.timezone,
    currency: range.currency,
  };
}

/** Giao dịch khớp account khi account là nguồn **hoặc** đích. */
function accountFilter(accountId?: string): Prisma.TransactionWhereInput {
  if (!accountId) return {};
  return { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] };
}

function convertFrom(
  amount: Decimal,
  fromAccountId: string,
  context: ReportContext,
): Decimal {
  const currency = context.currencyOf.get(fromAccountId) ?? context.currency;
  return convert(amount, currency, context.currency, context.rates);
}

// --- /report/total-balance ---------------------------------------------------

export async function getTotalBalance(
  userId: string,
  defaultCurrency: string,
  query: TotalBalanceQuery,
) {
  const context = await resolveContext(userId, defaultCurrency, query);
  const asOf = query.asOf ?? new Date();

  const accounts = await prisma.account.findMany({
    where: { userId, isDeleted: false },
    select: { id: true, currency: true },
  });

  const balances = await computeBalances(userId, {
    accountIds: accounts.map((account) => account.id),
    asOf,
  });

  // Gom số dư **gốc** theo từng currency trước, chỉ quy đổi khi cộng vào `total`.
  const byCurrency = new Map<string, { balance: Decimal; accountCount: number }>();
  let total = ZERO;

  for (const account of accounts) {
    const balance = balances.get(account.id)?.currentBalance ?? ZERO;

    const entry = byCurrency.get(account.currency) ?? {
      balance: ZERO,
      accountCount: 0,
    };
    entry.balance = entry.balance.add(balance);
    entry.accountCount += 1;
    byCurrency.set(account.currency, entry);
  }

  for (const [currency, entry] of byCurrency) {
    total = total.add(convert(entry.balance, currency, context.currency, context.rates));
  }

  return {
    total: toAmountString(total),
    currency: context.currency,
    accountCount: accounts.length,
    byCurrency: [...byCurrency.entries()].map(([currency, entry]) => ({
      currency,
      balance: toAmountString(entry.balance),
      accountCount: entry.accountCount,
    })),
    asOf: asOf.toISOString(),
  };
}

// --- /report/expense-vs-income -----------------------------------------------

export async function getExpenseVsIncome(
  userId: string,
  defaultCurrency: string,
  query: ExpenseVsIncomeQuery,
) {
  const context = await resolveContext(userId, defaultCurrency, query);
  const range = resolvePeriod(query, context);

  const where: Prisma.TransactionWhereInput = {
    userId,
    isDeleted: false,
    date: { gte: range.dateFrom, lte: range.dateTo },
    type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
    ...accountFilter(query.accountId),
  };

  const [rows, transactionCount] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type", "fromAccountId"],
      where,
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where }),
  ]);

  let income = ZERO;
  let expense = ZERO;

  for (const row of rows) {
    const amount = convertFrom(toDecimal(row._sum.amount), row.fromAccountId, context);
    if (row.type === TransactionType.INCOME) income = income.add(amount);
    else expense = expense.add(amount);
  }

  return {
    income: toAmountString(income),
    expense: toAmountString(expense),
    net: toAmountString(income.minus(expense)),
    transactionCount,
    range: serializeRange(range),
  };
}

// --- /report/expense-by-category ---------------------------------------------

export async function getExpenseByCategory(
  userId: string,
  defaultCurrency: string,
  query: ExpenseByCategoryQuery,
) {
  const context = await resolveContext(userId, defaultCurrency, query);
  const range = resolvePeriod(query, context);

  const flowType =
    query.flow === "INCOME" ? TransactionType.INCOME : TransactionType.EXPENSE;

  const [rows, rootOf] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId", "fromAccountId"],
      where: {
        userId,
        isDeleted: false,
        type: flowType,
        date: { gte: range.dateFrom, lte: range.dateTo },
        ...accountFilter(query.accountId),
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    loadRootCategoryMap(userId),
  ]);

  // Gom về danh mục cha level 1 — chi tiêu của danh mục con cộng vào danh mục cha.
  const grouped = new Map<string, { amount: Decimal; transactionCount: number }>();
  const UNCATEGORIZED = "__uncategorized__";

  for (const row of rows) {
    const rootId = row.categoryId
      ? rootOf.get(row.categoryId) ?? row.categoryId
      : UNCATEGORIZED;

    const entry = grouped.get(rootId) ?? { amount: ZERO, transactionCount: 0 };
    entry.amount = entry.amount.add(
      convertFrom(toDecimal(row._sum.amount), row.fromAccountId, context),
    );
    entry.transactionCount += row._count._all;
    grouped.set(rootId, entry);
  }

  const categoryIds = [...grouped.keys()].filter((id) => id !== UNCATEGORIZED);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, icon: true, color: true },
  });
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  let totalAmount = ZERO;
  for (const entry of grouped.values()) totalAmount = totalAmount.add(entry.amount);

  const items = [...grouped.entries()]
    .map(([id, entry]) => {
      const category = id === UNCATEGORIZED ? undefined : categoryById.get(id);
      return {
        categoryId: id === UNCATEGORIZED ? null : id,
        name: category?.name ?? UNCATEGORIZED_LABEL,
        icon: category?.icon ?? null,
        color: category?.color ?? null,
        amount: toAmountString(entry.amount),
        percentage: toPercentage(entry.amount, totalAmount),
        transactionCount: entry.transactionCount,
        // Giữ Decimal để sort chính xác, bỏ trước khi trả về.
        _amount: entry.amount,
      };
    })
    .sort((a, b) => b._amount.comparedTo(a._amount));

  const { skip, take } = toSkipTake(query);

  return {
    data: items.slice(skip, skip + take).map(({ _amount, ...item }) => {
      void _amount;
      return item;
    }),
    meta: {
      ...buildMeta(query, items.length),
      range: serializeRange(range),
      // Mẫu số của `percentage` — tính trên toàn bộ danh mục, không chỉ trang này.
      totalAmount: toAmountString(totalAmount),
    },
  };
}

// --- /report/expense-analysis ------------------------------------------------

export async function getExpenseAnalysis(
  userId: string,
  defaultCurrency: string,
  query: ExpenseAnalysisQuery,
) {
  const context = await resolveContext(userId, defaultCurrency, query);
  const now = new Date();

  // Có `dateFrom`/`dateTo` thì bỏ qua `months`.
  const fallback = lastMonthsRange(query.months, context.timezone, now);
  const range: PeriodRange = {
    dateFrom: query.dateFrom ?? fallback.dateFrom,
    dateTo: query.dateTo ?? fallback.dateTo,
    timezone: context.timezone,
    currency: context.currency,
  };

  let categoryIds: string[] | undefined;
  if (query.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: query.categoryId,
        OR: [{ scope: "SYSTEM" }, { userId }],
      },
      select: { id: true },
    });
    if (!category) {
      throw notFound("NOT_FOUND", "Không tìm thấy dữ liệu dùng trong bộ lọc.", {
        categoryId: query.categoryId,
      });
    }
    categoryIds = await expandCategoryIds(userId, query.categoryId);
  }

  // Gom tháng ở tầng ứng dụng: hàm MONTH() của MySQL chạy theo timezone của DB
  // nên sẽ cắt sai mốc so với `timezone` mà client yêu cầu.
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      isDeleted: false,
      type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
      date: { gte: range.dateFrom, lte: range.dateTo },
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      ...accountFilter(query.accountId),
    },
    select: { type: true, amount: true, date: true, fromAccountId: true },
  });

  // Sinh đủ mốc tháng trước, kể cả tháng không phát sinh giao dịch — thiếu tháng
  // thì biểu đồ cột sẽ vẽ sai khoảng cách trục X.
  const monthKeys = listMonthKeys(range.dateFrom, range.dateTo, context.timezone);
  const buckets = new Map<
    string,
    { income: Decimal; expense: Decimal; transactionCount: number }
  >();
  for (const key of monthKeys) {
    buckets.set(key, { income: ZERO, expense: ZERO, transactionCount: 0 });
  }

  for (const transaction of transactions) {
    const key = formatMonthKey(transaction.date, context.timezone);
    const bucket = buckets.get(key);
    if (!bucket) continue;

    const amount = convertFrom(
      toDecimal(transaction.amount),
      transaction.fromAccountId,
      context,
    );

    if (transaction.type === TransactionType.INCOME) {
      bucket.income = bucket.income.add(amount);
    } else {
      bucket.expense = bucket.expense.add(amount);
    }
    bucket.transactionCount += 1;
  }

  let totalIncome = ZERO;
  let totalExpense = ZERO;
  for (const bucket of buckets.values()) {
    totalIncome = totalIncome.add(bucket.income);
    totalExpense = totalExpense.add(bucket.expense);
  }

  const items = monthKeys.map((month) => {
    const bucket = buckets.get(month)!;
    return {
      month,
      income: toAmountString(bucket.income),
      expense: toAmountString(bucket.expense),
      net: toAmountString(bucket.income.minus(bucket.expense)),
      transactionCount: bucket.transactionCount,
    };
  });

  const { skip, take } = toSkipTake(query);

  return {
    data: items.slice(skip, skip + take),
    meta: {
      ...buildMeta(query, items.length),
      range: serializeRange(range),
      totalIncome: toAmountString(totalIncome),
      totalExpense: toAmountString(totalExpense),
    },
  };
}

// --- /report/money-lend-borrow -----------------------------------------------

export async function getMoneyLendBorrow(
  userId: string,
  defaultCurrency: string,
  query: MoneyLendBorrowQuery,
) {
  const context = await resolveContext(userId, defaultCurrency, query);

  if (query.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: query.contactId, userId, isDeleted: false },
      select: { id: true },
    });
    if (!contact) {
      throw notFound("NOT_FOUND", "Không tìm thấy dữ liệu dùng trong bộ lọc.", {
        contactId: query.contactId,
      });
    }
  }

  const types = query.kind
    ? [query.kind as TransactionType]
    : [TransactionType.LEND, TransactionType.BORROW];

  // Khác các endpoint khác: không tự áp kỳ tháng hiện tại khi client bỏ trống.
  const where: Prisma.TransactionWhereInput = {
    userId,
    isDeleted: false,
    type: { in: types },
    ...(query.dateFrom || query.dateTo
      ? {
          date: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        }
      : {}),
    ...(query.contactId ? { contactId: query.contactId } : {}),
    ...accountFilter(query.accountId),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      id: true,
      type: true,
      amount: true,
      date: true,
      note: true,
      contactId: true,
      contact: { select: { name: true } },
      fromAccountId: true,
      fromAccount: { select: { name: true } },
    },
  });

  // Quy đổi trước rồi mới sort theo tiền — sort ở DB sẽ so số thô của các
  // currency khác nhau, cho thứ tự vô nghĩa khi user dùng nhiều tiền tệ.
  const items = transactions.map((transaction) => {
    const amount = convertFrom(
      toDecimal(transaction.amount),
      transaction.fromAccountId,
      context,
    );

    return {
      id: transaction.id,
      kind: transaction.type as "LEND" | "BORROW",
      contactId: transaction.contactId,
      contactName: transaction.contact?.name ?? null,
      note: transaction.note,
      amount: toAmountString(amount),
      currency: context.currency,
      accountId: transaction.fromAccountId,
      accountName: transaction.fromAccount.name,
      date: transaction.date.toISOString(),
      _amount: amount,
      _date: transaction.date,
    };
  });

  items.sort((a, b) => {
    switch (query.sort) {
      case "amount_asc":
        return a._amount.comparedTo(b._amount);
      case "date_desc":
        return b._date.getTime() - a._date.getTime();
      case "date_asc":
        return a._date.getTime() - b._date.getTime();
      default:
        return b._amount.comparedTo(a._amount);
    }
  });

  let totalLend = ZERO;
  let totalBorrow = ZERO;
  for (const item of items) {
    if (item.kind === "LEND") totalLend = totalLend.add(item._amount);
    else totalBorrow = totalBorrow.add(item._amount);
  }

  const dates = transactions.map((transaction) => transaction.date.getTime());
  const range: PeriodRange = {
    dateFrom:
      query.dateFrom ?? (dates.length > 0 ? new Date(Math.min(...dates)) : new Date(0)),
    dateTo:
      query.dateTo ?? (dates.length > 0 ? new Date(Math.max(...dates)) : new Date(0)),
    timezone: context.timezone,
    currency: context.currency,
  };

  const { skip, take } = toSkipTake(query);

  return {
    data: items.slice(skip, skip + take).map(({ _amount, _date, ...item }) => {
      void _amount;
      void _date;
      return item;
    }),
    meta: {
      ...buildMeta(query, items.length),
      range: serializeRange(range),
      totalLend: toAmountString(totalLend),
      totalBorrow: toAmountString(totalBorrow),
    },
  };
}

// --- /report/overview --------------------------------------------------------

export async function getReportOverview(
  userId: string,
  defaultCurrency: string,
  query: ReportOverviewQuery,
) {
  const context = await resolveContext(userId, defaultCurrency, query);
  const now = new Date();

  const accounts = await prisma.account.findMany({
    where: { userId, isDeleted: false },
    select: { id: true, currency: true },
  });

  const balances = await computeBalances(userId, {
    accountIds: accounts.map((account) => account.id),
  });

  // Số dư dương là tài sản, số dư âm (thẻ tín dụng) là nợ — không bù trừ lẫn nhau.
  let assets = ZERO;
  let liabilities = ZERO;

  for (const account of accounts) {
    const balance = balances.get(account.id)?.currentBalance ?? ZERO;
    const converted = convert(
      balance,
      account.currency,
      context.currency,
      context.rates,
    );

    if (converted.isNegative()) liabilities = liabilities.add(converted.abs());
    else assets = assets.add(converted);
  }

  const loans = await prisma.transaction.groupBy({
    by: ["type", "fromAccountId"],
    where: {
      userId,
      isDeleted: false,
      type: { in: [TransactionType.LEND, TransactionType.BORROW] },
    },
    _sum: { amount: true },
  });

  for (const row of loans) {
    const amount = convertFrom(toDecimal(row._sum.amount), row.fromAccountId, context);
    // Đã cho mượn là khoản phải thu → tài sản; đang đi mượn là khoản phải trả → nợ.
    if (row.type === TransactionType.LEND) assets = assets.add(amount);
    else liabilities = liabilities.add(amount);
  }

  const periodBounds: Record<ReportPeriodId, { dateFrom: Date; dateTo: Date }> = {
    today: {
      dateFrom: startOfDay(now, context.timezone),
      dateTo: endOfDay(now, context.timezone),
    },
    this_week: {
      dateFrom: startOfWeek(now, context.timezone),
      dateTo: endOfWeek(now, context.timezone),
    },
    this_month: {
      dateFrom: startOfMonth(now, context.timezone),
      dateTo: endOfMonth(now, context.timezone),
    },
    this_year: {
      dateFrom: startOfYear(now, context.timezone),
      dateTo: endOfYear(now, context.timezone),
    },
  };

  // Kỳ dài nhất bao trùm mọi kỳ còn lại, nên một truy vấn là đủ cho cả 4 kỳ.
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      isDeleted: false,
      type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
      date: {
        gte: periodBounds.this_year.dateFrom,
        lte: periodBounds.this_year.dateTo,
      },
    },
    select: { type: true, amount: true, date: true, fromAccountId: true },
  });

  const periods = (Object.keys(periodBounds) as ReportPeriodId[]).map((id) => {
    const bounds = periodBounds[id];
    let income = ZERO;
    let expense = ZERO;

    for (const transaction of transactions) {
      const time = transaction.date.getTime();
      if (time < bounds.dateFrom.getTime() || time > bounds.dateTo.getTime()) continue;

      const amount = convertFrom(
        toDecimal(transaction.amount),
        transaction.fromAccountId,
        context,
      );

      if (transaction.type === TransactionType.INCOME) income = income.add(amount);
      else expense = expense.add(amount);
    }

    return {
      id,
      label: REPORT_PERIOD_LABELS[id],
      dateFrom: bounds.dateFrom.toISOString(),
      dateTo: bounds.dateTo.toISOString(),
      income: toAmountString(income),
      expense: toAmountString(expense),
      net: toAmountString(income.minus(expense)),
    };
  });

  return {
    statement: {
      netWorth: toAmountString(assets.minus(liabilities)),
      assets: toAmountString(assets),
      liabilities: toAmountString(liabilities),
    },
    periods,
    currency: context.currency,
    timezone: context.timezone,
  };
}
