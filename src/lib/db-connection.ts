/**
 * Chuẩn hoá connection string MySQL trước khi đưa vào driver adapter.
 *
 * Dùng chung cho runtime (`src/lib/prisma.ts`) và seed script để hai nơi luôn
 * kết nối bằng cùng một bộ tham số.
 *
 * - TiDB Cloud Starter bắt buộc TLS → tự thêm `?ssl=true` khi host không phải
 *   localhost và chuỗi kết nối chưa khai báo (đặt `DATABASE_SSL=false` để tắt).
 * - Trên Vercel mỗi lambda giữ một pool riêng → siết `connectionLimit` để không
 *   cạn kết nối phía DB (chỉnh qua `DATABASE_CONNECTION_LIMIT`, mặc định 3).
 */
export function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("Thiếu biến môi trường DATABASE_URL");
  }

  const url = new URL(raw);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if (
    !isLocal &&
    process.env.DATABASE_SSL !== "false" &&
    !url.searchParams.has("ssl")
  ) {
    url.searchParams.set("ssl", "true");
  }

  if (!url.searchParams.has("connectionLimit")) {
    url.searchParams.set(
      "connectionLimit",
      process.env.DATABASE_CONNECTION_LIMIT ?? "3",
    );
  }

  return url.toString();
}
