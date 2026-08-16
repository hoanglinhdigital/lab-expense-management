import { z } from "zod";
import { paginationSchema } from "../pagination";
import { booleanParamSchema, keywordSchema } from "../validation";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Tên đối tượng không được để trống.")
  .max(50, "Tên đối tượng tối đa 50 ký tự.");

const phoneSchema = z
  .string()
  .trim()
  .max(20, "Số điện thoại tối đa 20 ký tự.")
  .nullable()
  .refine((value) => value === null || /^[0-9+\-()\s]+$/.test(value), {
    message: "Số điện thoại chỉ được chứa chữ số và các ký tự + - ( ).",
  });

const emailSchema = z
  .string()
  .trim()
  .max(255)
  .nullable()
  .refine(
    (value) => value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    { message: "Email không đúng định dạng." },
  );

const noteSchema = z.string().trim().max(500).nullable();

export const listContactsQuerySchema = paginationSchema({
  defaultPageSize: 50,
  maxPageSize: 100,
}).extend({
  keyword: keywordSchema(50),
  sort: z
    .enum(["name_asc", "name_desc", "created_desc", "created_asc"])
    .default("name_asc"),
  includeTotals: booleanParamSchema,
});

export const createContactSchema = z.object({
  name: nameSchema,
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  note: noteSchema.optional(),
});

export const updateContactSchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    note: noteSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Cần ít nhất một trường để cập nhật.",
  });

export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
