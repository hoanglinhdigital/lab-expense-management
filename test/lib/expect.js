/**
 * Cầu nối giữa `check()` của k6 và cách viết test cũ.
 *
 * Bản Node trước đây dùng `check(id, ok, detail)` với `id` là mã test case khớp
 * bảng test case trong `plans/backend/*.md`. Giữ nguyên chữ ký đó ở đây để mã
 * case vẫn là thứ hiện lên trong summary của k6, tra ngược được khi có case fail.
 */

import { check as k6check, group } from "k6";

/**
 * @param {string} id      Mã test case (A1, B15, H23...)
 * @param {unknown} ok     Điều kiện cần đúng — nhận cả giá trị truthy
 * @param {string} detail  Thông tin hiện khi fail — luôn kèm dữ liệu thực tế
 */
export function expect(id, ok, detail = "") {
  const passed = k6check(null, { [id]: () => Boolean(ok) });
  if (!passed) console.error(`FAIL ${id} ${detail}`);
  return passed;
}

/** Gom các check của một module vào một group để summary đọc theo module. */
export function moduleGroup(name, fn) {
  console.log(`== ${name} ==`);
  group(name, fn);
}
