/**
 * Lỗi nghiệp vụ có mã ổn định để frontend so khớp.
 *
 * Service ném `ApiError`, route handler không bắt — `withApi()` trong `handler.ts`
 * chuyển thành response `{ error: { code, message, details } }` đúng spec.
 */

export type ErrorDetails = Record<string, unknown>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ErrorDetails;

  constructor(
    status: number,
    code: string,
    message: string,
    details: ErrorDetails = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function validationError(
  details: ErrorDetails = {},
  message = "Dữ liệu không hợp lệ.",
): ApiError {
  return new ApiError(400, "VALIDATION_ERROR", message, details);
}

export function unauthorized(): ApiError {
  return new ApiError(
    401,
    "UNAUTHORIZED",
    "Vui lòng đăng nhập để tiếp tục.",
  );
}

export function forbidden(
  code = "FORBIDDEN",
  message = "Bạn không có quyền thực hiện thao tác này.",
  details: ErrorDetails = {},
): ApiError {
  return new ApiError(403, code, message, details);
}

export function notFound(
  code = "NOT_FOUND",
  message = "Không tìm thấy dữ liệu yêu cầu.",
  details: ErrorDetails = {},
): ApiError {
  return new ApiError(404, code, message, details);
}

export function conflict(
  code: string,
  message: string,
  details: ErrorDetails = {},
): ApiError {
  return new ApiError(409, code, message, details);
}

export function internalError(): ApiError {
  return new ApiError(
    500,
    "INTERNAL_ERROR",
    "Đã có lỗi xảy ra, vui lòng thử lại sau.",
  );
}

// --- Lỗi dùng ở nhiều cụm chức năng ------------------------------------------

export function accountNotFound(): ApiError {
  return notFound("ACCOUNT_NOT_FOUND", "Không tìm thấy nguồn tiền.");
}

export function categoryNotFound(): ApiError {
  return notFound("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục.");
}

export function contactNotFound(): ApiError {
  return notFound("CONTACT_NOT_FOUND", "Không tìm thấy đối tượng.");
}

export function transactionNotFound(): ApiError {
  return notFound("TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch.");
}

export function systemCategoryReadonly(): ApiError {
  return forbidden(
    "SYSTEM_CATEGORY_READONLY",
    "Không thể sửa hoặc xoá danh mục hệ thống.",
  );
}

export function currencyNotSupported(details: ErrorDetails = {}): ApiError {
  return notFound(
    "CURRENCY_NOT_SUPPORTED",
    "Chưa hỗ trợ đồng tiền này.",
    details,
  );
}
