/**
 * Ràng buộc field theo `type` (bảng chuẩn trong `docs/api-spec/transaction.yaml`):
 *
 * | type     | toAccountId | categoryId | contactId |
 * |----------|-------------|------------|-----------|
 * | INCOME   | phải null   | bắt buộc   | phải null |
 * | EXPENSE  | phải null   | bắt buộc   | phải null |
 * | TRANSFER | bắt buộc    | phải null  | phải null |
 * | BORROW   | phải null   | phải null  | bắt buộc  |
 * | LEND     | phải null   | phải null  | bắt buộc  |
 *
 * Dùng `discriminatedUnion` để mỗi type có schema riêng — field thừa bị coi là
 * lỗi chứ không âm thầm bỏ qua.
 */

import { z } from "zod";
import { TransactionType } from "@/generated/prisma/enums";
import { paginationSchema } from "../pagination";
import {
  decimalAmountSchema,
  isoDateSchema,
  keywordSchema,
  positiveAmountSchema,
  repeatableEnum,
  booleanParamSchema,
} from "../validation";

const TRANSACTION_TYPES = Object.values(TransactionType) as [string, ...string[]];

const idSchema = z.string().trim().min(1);
const noteSchema = z.string().trim().max(500).nullable();

/** Field chung của mọi loại giao dịch. */
const baseFields = {
  amount: positiveAmountSchema,
  date: isoDateSchema,
  note: noteSchema.optional(),
  fromAccountId: idSchema,
};

/** Field không được dùng với type này — gửi lên là lỗi, không phải bỏ qua. */
function forbiddenField(message: string) {
  return z
    .null()
    .optional()
    .or(z.undefined())
    .refine((value) => value === null || value === undefined, { message });
}

const flowSchema = (type: "INCOME" | "EXPENSE") =>
  z.object({
    type: z.literal(type),
    ...baseFields,
    categoryId: idSchema,
    toAccountId: forbiddenField("Giao dịch thu/chi không có tài khoản đích."),
    contactId: forbiddenField("Giao dịch thu/chi không có đối tượng vay/mượn."),
    receiveAmount: forbiddenField("Chỉ giao dịch chuyển khoản mới có số tiền nhận."),
  });

const loanSchema = (type: "BORROW" | "LEND") =>
  z.object({
    type: z.literal(type),
    ...baseFields,
    contactId: idSchema,
    toAccountId: forbiddenField("Giao dịch vay/cho mượn không có tài khoản đích."),
    categoryId: forbiddenField("Giao dịch vay/cho mượn không gắn danh mục."),
    receiveAmount: forbiddenField("Chỉ giao dịch chuyển khoản mới có số tiền nhận."),
  });

const transferSchema = z
  .object({
    type: z.literal("TRANSFER"),
    ...baseFields,
    toAccountId: idSchema,
    receiveAmount: positiveAmountSchema.nullable().optional(),
    categoryId: forbiddenField("Giao dịch chuyển khoản không gắn danh mục."),
    contactId: forbiddenField("Giao dịch chuyển khoản không có đối tượng vay/mượn."),
  })
  .refine((value) => value.toAccountId !== value.fromAccountId, {
    message: "Tài khoản đích phải khác tài khoản nguồn.",
    path: ["toAccountId"],
  });

export const transactionBodySchema = z.discriminatedUnion("type", [
  flowSchema("INCOME"),
  flowSchema("EXPENSE"),
  transferSchema,
  loanSchema("BORROW"),
  loanSchema("LEND"),
]);

export const listTransactionsQuerySchema = paginationSchema({
  defaultPageSize: 20,
  maxPageSize: 100,
})
  .extend({
    dateFrom: isoDateSchema.optional(),
    dateTo: isoDateSchema.optional(),
    accountId: idSchema.optional(),
    categoryId: idSchema.optional(),
    includeChildCategories: booleanParamSchema,
    type: repeatableEnum(TRANSACTION_TYPES),
    contactId: idSchema.optional(),
    keyword: keywordSchema(200),
    minAmount: decimalAmountSchema.optional(),
    maxAmount: decimalAmountSchema.optional(),
    sort: z
      .enum(["date_desc", "date_asc", "amount_desc", "amount_asc", "created_desc"])
      .default("date_desc"),
  })
  .refine(
    (value) =>
      !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    { message: "Ngày bắt đầu phải trước ngày kết thúc.", path: ["dateFrom"] },
  )
  .refine(
    (value) =>
      value.minAmount === undefined ||
      value.maxAmount === undefined ||
      Number(value.minAmount) <= Number(value.maxAmount),
    { message: "Số tiền tối thiểu phải nhỏ hơn số tiền tối đa.", path: ["minAmount"] },
  );

export type TransactionBodyInput = z.infer<typeof transactionBodySchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
