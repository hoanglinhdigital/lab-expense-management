/**
 * HTTP client cho k6 — mỗi client giữ cookie jar riêng, nhờ vậy dựng được nhiều
 * người dùng song song và kiểm chứng dữ liệu giữa họ hoàn toàn tách bạch.
 *
 * k6 chạy đồng bộ: `call()` trả thẳng kết quả, không có Promise.
 */

import http from "k6/http";
import { sleep } from "k6";

export const BASE_URL = __ENV.API_BASE_URL || "http://localhost:3000/api";

// Bộ test cố tình gọi rất nhiều case lỗi (400/401/404/409). Không khai báo lại
// dải status "thành công" thì k6 đếm chúng vào `http_req_failed` và threshold
// của metric đó sẽ fail dù mọi check đều đạt.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

export function makeClient(label) {
  const jar = new http.CookieJar();

  return {
    label,
    jar,

    call(method, path, body) {
      const res = http.request(
        method,
        BASE_URL + path,
        body === undefined ? null : JSON.stringify(body),
        {
          jar,
          headers: { "Content-Type": "application/json" },
          tags: { client: label, endpoint: path.split("?")[0] },
        },
      );

      let json = null;
      if (res.status !== 204 && res.body) {
        try {
          json = JSON.parse(res.body);
        } catch {
          json = null;
        }
      }

      return { status: res.status, body: json, headers: res.headers };
    },

    /** Cookie đang giữ cho BASE_URL — dùng để kiểm chứng phiên đăng nhập. */
    cookies() {
      return jar.cookiesForURL(BASE_URL);
    },
  };
}

/** Chờ dev server sẵn sàng — trả `true` khi API phản hồi (kể cả 401). */
export function waitForServer(timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 60000);

  while (Date.now() < deadline) {
    // Server chưa lên thì k6 trả status 0 thay vì ném lỗi.
    const res = http.get(`${BASE_URL}/currencies`, {
      tags: { endpoint: "healthcheck" },
    });
    if (res.status > 0) return true;
    sleep(0.5);
  }

  return false;
}
