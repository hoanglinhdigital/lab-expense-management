/**
 * Phiên đăng nhập dựa trên bảng `Session` + cookie `session` httpOnly.
 *
 * Cookie chỉ chứa token ngẫu nhiên; mọi thông tin khác tra từ DB, nhờ vậy
 * `logout` huỷ được phiên thật chứ không chỉ xoá cookie phía trình duyệt.
 */

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "session";

const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? "30");
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  defaultCurrency: string;
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Cookie `Secure` bị trình duyệt bỏ qua trên kết nối HTTP thuần (vd ALB dev
 * chưa có HTTPS listener) — set COOKIE_SECURE=false để tắt tạm thời. Khi
 * không set, giữ nguyên hành vi mặc định theo NODE_ENV.
 */
function isCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

/** Tạo phiên mới trong DB và gắn cookie vào response đang được dựng. */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({ data: { userId, token, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isCookieSecure(),
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Trả user của phiên hiện tại, hoặc `null` nếu chưa đăng nhập / phiên hết hạn.
 * Phiên hết hạn bị xoá luôn khỏi DB để bảng không phình theo thời gian.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          defaultCurrency: true,
          isDeleted: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (session.user.isDeleted) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    defaultCurrency: session.user.defaultCurrency,
  };
}

/** Huỷ phiên hiện tại trong DB và xoá cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isCookieSecure(),
    path: "/",
    maxAge: 0,
  });
}
