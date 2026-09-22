import { z } from "zod";
import { DEFAULT_TIMEZONE } from "../constants";
import { paginationSchema } from "../pagination";
import { currencyCodeSchema, intParam, isoDateSchema } from "../validation";

/** Param kỳ báo cáo dùng chung cho gần như mọi endpoint report. */
const periodFields = {
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  timezone: z.string().trim().min(1).default(DEFAULT_TIMEZONE),
  currency: currencyCodeSchema.optional(),
};

const accountFilter = { accountId: z.string().trim().min(1).optional() };

function withDateOrder<T extends { dateFrom?: Date; dateTo?: Date }>(
  schema: z.ZodType<T>,
) {
  return schema.refine(
    (value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    { message: "Ngày bắt đầu phải trước ngày kết thúc.", path: ["dateFrom"] },
  );
}

export const totalBalanceQuerySchema = z.object({
  timezone: periodFields.timezone,
  currency: periodFields.currency,
  asOf: isoDateSchema.optional(),
});

export const expenseVsIncomeQuerySchema = withDateOrder(
  z.object({ ...periodFields, ...accountFilter }),
);

export const expenseByCategoryQuerySchema = withDateOrder(
  paginationSchema({ defaultPageSize: 50, maxPageSize: 100 }).extend({
    ...periodFields,
    ...accountFilter,
    flow: z.enum(["EXPENSE", "INCOME"]).default("EXPENSE"),
    parentId: z.string().trim().min(1).optional(),
    sortType: z.enum(["asc", "desc"]).default("desc"),
  }),
);

export const expenseAnalysisQuerySchema = withDateOrder(
  paginationSchema({ defaultPageSize: 50, maxPageSize: 100 }).extend({
    ...periodFields,
    ...accountFilter,
    months: intParam({ min: 1, max: 60, default: 6 }),
    categoryId: z.string().trim().min(1).optional(),
  }),
);

export const moneyLendBorrowQuerySchema = withDateOrder(
  z.object({
    page: intParam({ min: 1, default: 1 }),
    // Khối "Money lent/borrowed" ở Home mặc định chỉ hiện 5 khoản lớn nhất.
    pageSize: intParam({ min: 1, max: 100, default: 5 }),
    ...periodFields,
    ...accountFilter,
    kind: z.enum(["LEND", "BORROW"]).optional(),
    contactId: z.string().trim().min(1).optional(),
    sort: z
      .enum(["amount_desc", "amount_asc", "date_desc", "date_asc"])
      .default("amount_desc"),
  }),
);

export const reportOverviewQuerySchema = z.object({
  timezone: periodFields.timezone,
  currency: periodFields.currency,
});

export type TotalBalanceQuery = z.infer<typeof totalBalanceQuerySchema>;
export type ExpenseVsIncomeQuery = z.infer<typeof expenseVsIncomeQuerySchema>;
export type ExpenseByCategoryQuery = z.infer<typeof expenseByCategoryQuerySchema>;
export type ExpenseAnalysisQuery = z.infer<typeof expenseAnalysisQuerySchema>;
export type MoneyLendBorrowQuery = z.infer<typeof moneyLendBorrowQuerySchema>;
export type ReportOverviewQuery = z.infer<typeof reportOverviewQuerySchema>;
