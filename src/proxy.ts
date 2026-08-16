/**
 * Chỉ kiểm tra có/không có cookie `session` — không gọi DB ở edge runtime.
 * Cookie hết hạn/không hợp lệ vẫn phải do client tự xử lý khi API trả 401
 * (xem `src/lib/api/client.ts` — `isUnauthorized`).
 */

import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "session";

const AUTH_PATHS = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const hasSession = Boolean(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  const { pathname } = request.nextUrl;
  const isAuthPath = AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!hasSession && !isAuthPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isAuthPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
