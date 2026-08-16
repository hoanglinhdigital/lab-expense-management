/**
 * Bọc route handler: bắt lỗi tập trung và (với `withAuth`) xác định người dùng
 * đang đăng nhập trước khi chạy nghiệp vụ.
 *
 * Nhờ lớp này mà mọi route đều chắc chắn có `user.id`, không route nào nhận
 * `userId` từ client.
 */

import type { NextRequest } from "next/server";
import { unauthorized } from "./errors";
import { toErrorResponse } from "./response";
import { getSessionUser, type SessionUser } from "./session";

type Context<P> = { params: Promise<P> };

type AuthedHandler<P> = (
  request: NextRequest,
  user: SessionUser,
  params: P,
) => Promise<Response>;

type PublicHandler<P> = (
  request: NextRequest,
  params: P,
) => Promise<Response>;

/** Route công khai (chỉ nhóm auth) — vẫn bắt lỗi tập trung. */
export function withApi<P = Record<string, never>>(handler: PublicHandler<P>) {
  return async (request: NextRequest, context?: Context<P>): Promise<Response> => {
    try {
      const params = ((await context?.params) ?? {}) as P;
      return await handler(request, params);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** Route bắt buộc đăng nhập — mọi API ngoài nhóm auth đều dùng cái này. */
export function withAuth<P = Record<string, never>>(handler: AuthedHandler<P>) {
  return async (request: NextRequest, context?: Context<P>): Promise<Response> => {
    try {
      const user = await getSessionUser();
      if (!user) throw unauthorized();

      const params = ((await context?.params) ?? {}) as P;
      return await handler(request, user, params);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
