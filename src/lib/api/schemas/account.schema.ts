import { z } from "zod";
import { AccountType } from "@/generated/prisma/enums";
import { paginationSchema } from "../pagination";
import {
  currencyCodeSchema,
  decimalAmountSchema,
  isoDateSchema,
  keywordSchema,
  repeatableEnum,
} from "../validation";

const ACCOUNT_TYPES = Object.values(AccountType) as [string, ...string[]];

const nameSchema = z
  .string()
  .trim()
  .min(1, "Tên nguồn tiền không được để trống.")
  .max(50, "Tên nguồn tiền tối đa 50 ký tự.");

const iconSchema = z.string().trim().max(32).nullable();
const descriptionSchema = z.string().trim().max(200).nullable();

export const listAccountsQuerySchema = paginationSchema({
  defaultPageSize: 20,
  maxPageSize: 100,
}).extend({
  type: repeatableEnum(ACCOUNT_TYPES),
  currency: currencyCodeSchema.optional(),
  keyword: keywordSchema(50),
  sort: z
    .enum([
      "name_asc",
      "name_desc",
      "balance_asc",
      "balance_desc",
      "created_asc",
      "created_desc",
    ])
    .default("created_desc"),
});

export const accountSummaryQuerySchema = z.object({
  currency: currencyCodeSchema.optional(),
});

export const accountBalanceQuerySchema = z.object({
  asOf: isoDateSchema.optional(),
});

export const createAccountSchema = z.object({
  name: nameSchema,
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: decimalAmountSchema.default("0.00"),
  currency: currencyCodeSchema,
  icon: iconSchema.optional(),
  description: descriptionSchema.optional(),
  isDefault: z.boolean().default(false),
});

export const updateAccountSchema = z
  .object({
    name: nameSchema.optional(),
    type: z.enum(ACCOUNT_TYPES).optional(),
    initialBalance: decimalAmountSchema.optional(),
    currency: currencyCodeSchema.optional(),
    icon: iconSchema.optional(),
    description: descriptionSchema.optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Cần ít nhất một trường để cập nhật.",
  });

export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
