/**
 * Parse & validate request bằng zod, chuyển lỗi zod thành `details` theo tên field
 * đúng như ví dụ trong các file spec.
 */

import { z } from "zod";
import { validationError } from "./errors";

/** Gom issue của zod thành `{ <field>: <message> }`, giữ issue đầu tiên mỗi field. */
function toDetails(error: z.ZodError): Record<string, string> {
  const details: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_";
    if (!(key in details)) details[key] = issue.message;
  }

  return details;
}

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(toDetails(result.error));
  return result.data;
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    throw validationError({ _: "Body phải là JSON hợp lệ." });
  }

  return parseOrThrow(schema, raw);
}

/**
 * Chuyển `URLSearchParams` thành object trước khi validate. Param xuất hiện nhiều
 * lần (ví dụ `?type=A&type=B`) giữ nguyên dạng mảng để schema tự xử lý.
 */
export function parseQuery<T>(url: URL, schema: z.ZodType<T>): T {
  const raw: Record<string, string | string[]> = {};

  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    raw[key] = values.length > 1 ? values : values[0];
  }

  return parseOrThrow(schema, raw);
}

// --- Schema nguyên thuỷ dùng lại ở nhiều cụm ---------------------------------

/** Query param dạng số nguyên — luôn tới dưới dạng chuỗi. */
export function intParam(options: { min: number; max?: number; default: number }) {
  let schema = z.coerce.number().int().min(options.min);
  if (options.max !== undefined) schema = schema.max(options.max);
  return schema.default(options.default);
}

/** Mã tiền tệ ISO 4217, chuẩn hoá về chữ hoa trước khi kiểm tra độ dài. */
export const currencyCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z]{3}$/.test(value), {
    message: "Mã tiền tệ phải gồm đúng 3 chữ cái.",
  });

/** Mốc thời gian ISO 8601. */
export const isoDateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Thời điểm phải theo định dạng ISO 8601.",
  })
  .transform((value) => new Date(value));

/** Số tiền dương, tối đa 2 chữ số thập phân — khớp `PositiveAmount` của spec. */
export const positiveAmountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^\d{1,16}(\.\d{1,2})?$/.test(value), {
    message: "Số tiền phải là số dương, tối đa 2 chữ số thập phân.",
  })
  .refine((value) => Number(value) > 0, {
    message: "Số tiền phải lớn hơn 0.",
  });

/** Số tiền có dấu — khớp `DecimalAmount` của spec. */
export const decimalAmountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^-?\d{1,16}(\.\d{1,2})?$/.test(value), {
    message: "Số tiền phải là số thập phân, tối đa 2 chữ số thập phân.",
  });

/** Query param boolean: chỉ chuỗi `"true"` được coi là bật. */
export const booleanParamSchema = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

/** Chuỗi tìm kiếm: rỗng sau khi trim thì coi như không truyền. */
export function keywordSchema(maxLength: number) {
  return z
    .string()
    .max(maxLength)
    .trim()
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();
}

/** Param có thể xuất hiện nhiều lần trong query string. */
export function repeatableEnum<T extends readonly [string, ...string[]]>(
  values: T,
) {
  return z
    .union([z.enum(values), z.array(z.enum(values))])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .optional();
}
