/**
 * Bọc dữ liệu vào đúng khung response của spec: `{ data, meta? }` khi thành công,
 * `{ error: { code, message, details } }` khi lỗi.
 */

import { ApiError, internalError } from "./errors";

export function ok<T>(
  data: T,
  meta?: unknown,
  init?: ResponseInit,
): Response {
  const body = meta === undefined ? { data } : { data, meta };
  return Response.json(body, { status: 200, ...init });
}

export function created<T>(data: T): Response {
  return Response.json({ data }, { status: 201 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function toErrorResponse(error: unknown): Response {
  const apiError = error instanceof ApiError ? error : internalError();

  if (!(error instanceof ApiError)) {
    console.error("[api] lỗi không mong đợi:", error);
  }

  return Response.json(
    {
      error: {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details,
      },
    },
    { status: apiError.status },
  );
}
