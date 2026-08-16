import { z } from "zod";
import { currencyCodeSchema } from "../validation";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập email.")
  .max(255, "Email tối đa 255 ký tự.")
  .toLowerCase()
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: "Email không đúng định dạng.",
  });

const passwordSchema = z
  .string()
  .min(6, "Mật khẩu phải có ít nhất 6 ký tự.")
  // 72 byte là giới hạn của bcrypt — dài hơn sẽ bị cắt âm thầm.
  .max(72, "Mật khẩu tối đa 72 ký tự.");

const nameSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập tên.")
  .max(100, "Tên tối đa 100 ký tự.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  defaultCurrency: currencyCodeSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    defaultCurrency: currencyCodeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Cần ít nhất một trường để cập nhật.",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
