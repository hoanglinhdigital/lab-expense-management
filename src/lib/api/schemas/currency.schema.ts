import { z } from "zod";
import { paginationSchema } from "../pagination";
import { currencyCodeSchema, keywordSchema } from "../validation";

export const listCurrenciesQuerySchema = paginationSchema({
  defaultPageSize: 50,
  maxPageSize: 200,
}).extend({
  keyword: keywordSchema(50),
});

export const exchangeRateQuerySchema = paginationSchema({
  defaultPageSize: 50,
  maxPageSize: 200,
}).extend({
  base: currencyCodeSchema.optional(),
  codes: z
    .string()
    .trim()
    .transform((value) =>
      value
        .split(",")
        .map((code) => code.trim().toUpperCase())
        .filter((code) => code.length > 0),
    )
    // Chuỗi rỗng coi như không truyền.
    .transform((codes) => (codes.length === 0 ? undefined : codes))
    .optional()
    .refine(
      (codes) => codes === undefined || codes.every((code) => /^[A-Z]{3}$/.test(code)),
      { message: "Mã tiền tệ phải gồm đúng 3 chữ cái." },
    ),
});

export type ListCurrenciesQuery = z.infer<typeof listCurrenciesQuerySchema>;
export type ExchangeRateQuery = z.infer<typeof exchangeRateQuerySchema>;
