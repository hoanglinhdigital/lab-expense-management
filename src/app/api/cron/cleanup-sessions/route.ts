/**
 * Dọn các phiên đăng nhập đã hết hạn để bảng `session` không phình theo thời gian.
 *
 * Được gọi định kỳ bởi Vercel Cron (khai báo trong `vercel.json`). Vercel tự đính
 * kèm header `Authorization: Bearer $CRON_SECRET` khi biến môi trường `CRON_SECRET`
 * tồn tại — route từ chối mọi request không mang đúng secret này.
 */

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const authorized =
    secret !== undefined &&
    secret !== "" &&
    request.headers.get("authorization") === `Bearer ${secret}`;

  if (!authorized) {
    return Response.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Thiếu hoặc sai CRON_SECRET",
          details: null,
        },
      },
      { status: 401 },
    );
  }

  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return Response.json({ data: { deleted: count } });
}
