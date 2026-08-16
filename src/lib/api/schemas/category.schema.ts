import { z } from "zod";
import { CategoryScope, CategoryType } from "@/generated/prisma/enums";
import { paginationSchema } from "../pagination";
import { booleanParamSchema, keywordSchema } from "../validation";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Tên danh mục không được để trống.")
  .max(50, "Tên danh mục tối đa 50 ký tự.");

const iconSchema = z.string().trim().max(32).nullable();

const colorSchema = z
  .string()
  .trim()
  .max(9)
  .nullable()
  .refine(
    (value) => value === null || /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value),
    { message: "Mã màu phải theo dạng #RRGGBB hoặc #RRGGBBAA." },
  );

export const listCategoriesQuerySchema = paginationSchema({
  defaultPageSize: 50,
  maxPageSize: 200,
}).extend({
  type: z.enum(CategoryType).optional(),
  scope: z.enum(CategoryScope).optional(),
  // Chuỗi rỗng nghĩa là "chỉ lấy danh mục gốc" (parentId = null).
  parentId: z.string().trim().optional(),
  tree: booleanParamSchema,
  keyword: keywordSchema(50),
});

export const createCategorySchema = z.object({
  name: nameSchema,
  type: z.enum(CategoryType),
  parentId: z.string().trim().min(1).nullable().optional(),
  icon: iconSchema.optional(),
  color: colorSchema.optional(),
});

export const updateCategorySchema = z
  .object({
    name: nameSchema.optional(),
    type: z.enum(CategoryType).optional(),
    parentId: z.string().trim().min(1).nullable().optional(),
    icon: iconSchema.optional(),
    color: colorSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Cần ít nhất một trường để cập nhật.",
  });

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
