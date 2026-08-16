/**
 * Test case A1–A14 — `plans/backend/01_auth.md`, spec `docs/api-spec/auth.yaml`.
 *
 * Chạy lẻ:  k6 run test/auth/auth.test.js
 *
 * Cung cấp cho các module sau: phiên đăng nhập của user A và user B.
 */

import { makeClient, waitForServer } from "../lib/http.js";
import { createContext } from "../lib/fixtures.js";
import { expect, moduleGroup } from "../lib/expect.js";
import { baseOptions } from "../lib/options.js";

export const options = baseOptions;
export const name = "auth";

export function run(ctx) {
  const { A, B, anon, stamp, emailA, emailB } = ctx;

  let r = A.call("POST", "/auth/register", {
    email: emailA,
    password: "matkhau123",
    name: "User A",
    defaultCurrency: "VND",
  });
  expect(
    "A1",
    r.status === 201 && r.body?.data?.id && !("passwordHash" in (r.body?.data ?? {})),
    JSON.stringify(r.body),
  );
  expect("A1-cookie", Boolean(A.cookies().session), "không nhận được cookie session");

  r = A.call("POST", "/auth/register", {
    email: emailA,
    password: "matkhau123",
    name: "Dup",
  });
  expect(
    "A2",
    r.status === 409 && r.body?.error?.code === "EMAIL_ALREADY_EXISTS",
    `${r.status} ${JSON.stringify(r.body)}`,
  );

  r = anon.call("POST", "/auth/register", {
    email: `x${stamp}@e.com`,
    password: "12345",
    name: "X",
  });
  expect("A3", r.status === 400 && r.body?.error?.details?.password, JSON.stringify(r.body));

  r = anon.call("POST", "/auth/register", {
    email: "khong-hop-le",
    password: "matkhau123",
    name: "X",
  });
  expect("A4", r.status === 400 && r.body?.error?.details?.email, JSON.stringify(r.body));

  r = anon.call("POST", "/auth/register", {
    email: `y${stamp}@e.com`,
    password: "matkhau123",
    name: "Y",
    defaultCurrency: "XYZ",
  });
  expect(
    "A5",
    r.status === 404 && r.body?.error?.code === "CURRENCY_NOT_SUPPORTED",
    `${r.status} ${JSON.stringify(r.body)}`,
  );

  r = A.call("POST", "/auth/login", { email: emailA, password: "matkhau123" });
  expect("A6", r.status === 200 && r.body?.data?.email === emailA, JSON.stringify(r.body));

  const wrongPass = anon.call("POST", "/auth/login", {
    email: emailA,
    password: "sai-mat-khau",
  });
  expect(
    "A7",
    wrongPass.status === 401 && wrongPass.body?.error?.code === "INVALID_CREDENTIALS",
    JSON.stringify(wrongPass.body),
  );

  const noUser = anon.call("POST", "/auth/login", {
    email: `khong-ton-tai-${stamp}@e.com`,
    password: "matkhau123",
  });
  // Sai email và sai mật khẩu phải trả cùng thông điệp, nếu không sẽ dò được
  // email nào đã đăng ký.
  expect(
    "A8",
    noUser.status === 401 && noUser.body?.error?.message === wrongPass.body?.error?.message,
    "thông điệp phải giống nhau để không dò được email",
  );

  r = A.call("GET", "/auth/me");
  expect("A9", r.status === 200 && r.body?.data?.email === emailA, JSON.stringify(r.body));

  r = anon.call("GET", "/auth/me");
  expect("A10", r.status === 401 && r.body?.error?.code === "UNAUTHORIZED", JSON.stringify(r.body));

  r = A.call("PATCH", "/auth/me", { name: "User A đã đổi tên" });
  expect(
    "A11",
    r.status === 200 && r.body?.data?.name === "User A đã đổi tên",
    JSON.stringify(r.body),
  );

  r = A.call("PATCH", "/auth/me", {});
  expect("A12", r.status === 400, JSON.stringify(r.body));

  // A13/A14: đăng nhập ở "thiết bị" thứ hai rồi logout đúng phiên đó.
  const secondDevice = makeClient("A-2");
  secondDevice.call("POST", "/auth/login", { email: emailA, password: "matkhau123" });
  r = secondDevice.call("POST", "/auth/logout");
  expect("A13-logout", r.status === 204, `${r.status}`);
  r = secondDevice.call("GET", "/auth/me");
  expect("A13", r.status === 401, "cookie cũ vẫn dùng được sau logout");
  r = A.call("GET", "/auth/me");
  expect("A14", r.status === 200, "logout một thiết bị làm mất phiên thiết bị khác");

  // User B tồn tại để các module sau kiểm chứng dữ liệu tách bạch giữa hai user.
  B.call("POST", "/auth/register", {
    email: emailB,
    password: "matkhau123",
    name: "User B",
  });

  ctx.ready.auth = true;
}

export default function main() {
  if (!waitForServer()) throw new Error("không kết nối được tới API — chạy `npm run dev` trước");

  const ctx = createContext();
  moduleGroup(name, () => run(ctx));
}
