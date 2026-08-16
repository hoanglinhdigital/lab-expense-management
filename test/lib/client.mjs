/**
 * HTTP client cho test — mỗi client giữ cookie jar riêng, nhờ vậy dựng được
 * nhiều người dùng song song và kiểm chứng dữ liệu giữa họ hoàn toàn tách bạch.
 */

export const BASE_URL =
  process.env.API_BASE_URL ?? "http://localhost:3000/api";

export function makeClient(label) {
  const jar = new Map();

  return {
    label,
    jar,

    async call(method, path, body) {
      const headers = { "Content-Type": "application/json" };
      const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookie) headers.Cookie = cookie;

      const res = await fetch(BASE_URL + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(";");
        const idx = pair.indexOf("=");
        jar.set(pair.slice(0, idx), pair.slice(idx + 1));
      }

      let json = null;
      if (res.status !== 204) {
        try {
          json = await res.json();
        } catch {
          json = null;
        }
      }

      return { status: res.status, body: json, headers: res.headers };
    },
  };
}

/** Chờ dev server sẵn sàng — trả `true` khi API phản hồi (kể cả 401). */
export async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/currencies`);
      if (res.status > 0) return true;
    } catch {
      // Server chưa lên, thử lại.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}
