/**
 * Fetch wrapper dùng chung cho mọi client component gọi API route (`/api/**`).
 *
 * Mọi API đều xác thực bằng cookie `session` httpOnly nên chỉ cần
 * `credentials: "include"`; lỗi được parse đúng khung `{ error: { code, message,
 * details } }` (xem `docs/api-spec/*.yaml`) rồi ném thành `ApiClientError` để nơi
 * gọi bắt và hiển thị `message` (đã là tiếng Việt do backend trả) qua `FormAlert`.
 */

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_MESSAGE_BY_STATUS: Record<number, string> = {
  400: "Dữ liệu không hợp lệ.",
  401: "Vui lòng đăng nhập để tiếp tục.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu.",
  409: "Dữ liệu bị xung đột, vui lòng thử lại.",
};

function defaultMessageFor(status: number): string {
  return (
    DEFAULT_MESSAGE_BY_STATUS[status] ??
    "Đã có lỗi xảy ra, vui lòng thử lại sau."
  );
}

/** `true` nếu lỗi là phiên hết hạn/chưa đăng nhập — nơi gọi nên điều hướng `/login`. */
export function isUnauthorized(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && error.status === 401;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.",
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const errorBody = (body as { error?: ApiErrorBody } | null)?.error;
    throw new ApiClientError(
      res.status,
      errorBody?.code ?? "UNKNOWN_ERROR",
      errorBody?.message ?? defaultMessageFor(res.status),
      errorBody?.details ?? {},
    );
  }

  return body as T;
}

/** Bỏ qua key có giá trị `undefined`/`null`/chuỗi rỗng khi build query string. */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** `DecimalAmount` (chuỗi) của API -> `number` dùng trong UI types hiện tại. */
export function fromDecimal(value: string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** `number` của UI -> `DecimalAmount` (chuỗi, tối đa 2 chữ số thập phân) gửi lên API. */
export function toDecimal(amount: number): string {
  return amount.toFixed(2);
}
