/**
 * Lớp giao tiếp auth phía client.
 *
 * Hiện chưa có API thật (`docs/api-spec/` chưa có spec cho auth), nên `login()`
 * và `register()` là stub: giả lập độ trễ mạng rồi trả về kết quả thành công.
 * Khi API sẵn sàng, chỉ cần thay phần thân hai hàm này bằng `fetch`, phần UI
 * không phải sửa vì kiểu dữ liệu trả về giữ nguyên.
 */

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

/** Lỗi theo từng field, key trùng tên field trong form. */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export type AuthResult =
  | { ok: true }
  | { ok: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function validateEmail(email: string): string | undefined {
  if (!email) return "Vui lòng nhập email.";
  if (!EMAIL_PATTERN.test(email)) return "Email không đúng định dạng.";
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return "Vui lòng nhập mật khẩu.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  }
  return undefined;
}

export function validateLogin(input: LoginInput): FieldErrors<LoginInput> {
  const errors: FieldErrors<LoginInput> = {};

  const emailError = validateEmail(input.email.trim());
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(input.password.trim());
  if (passwordError) errors.password = passwordError;

  return errors;
}

export function validateRegister(
  input: RegisterInput,
): FieldErrors<RegisterInput> {
  const errors: FieldErrors<RegisterInput> = {};

  const emailError = validateEmail(input.email.trim());
  if (emailError) errors.email = emailError;

  const password = input.password.trim();
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;

  const confirmPassword = input.confirmPassword.trim();
  if (!confirmPassword) {
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
  }

  return errors;
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function login(input: LoginInput): Promise<AuthResult> {
  await delay(600);
  // TODO: thay bằng POST /api/auth/login khi API sẵn sàng.
  void input;
  return { ok: true };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  await delay(600);
  // TODO: thay bằng POST /api/auth/register khi API sẵn sàng.
  void input;
  return { ok: true };
}
