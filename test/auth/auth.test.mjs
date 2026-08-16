/**
 * Test case A1–A14 — `plans/backend/01_auth.md`, spec `docs/api-spec/auth.yaml`.
 *
 * Cung cấp cho các module sau: phiên đăng nhập của user A và user B.
 */

import { makeClient } from "../lib/client.mjs";

export const name = "auth";
export const deps = [];

export async function run(ctx) {
  const { A, B, anon, check, stamp, emailA, emailB } = ctx;

  let r = await A.call("POST", "/auth/register", {
    email: emailA,
    password: "matkhau123",
    name: "User A",
    defaultCurrency: "VND",
  });
  check(
    "A1",
    r.status === 201 && r.body?.data?.id && !("passwordHash" in (r.body?.data ?? {})),
    JSON.stringify(r.body),
  );
  check("A1-cookie", A.jar.has("session"), "không nhận được cookie session");

  r = await A.call("POST", "/auth/register", {
    email: emailA,
    password: "matkhau123",
    name: "Dup",
  });
  check(
    "A2",
    r.status === 409 && r.body?.error?.code === "EMAIL_ALREADY_EXISTS",
    `${r.status} ${JSON.stringify(r.body)}`,
  );

  r = await anon.call("POST", "/auth/register", {
    email: `x${stamp}@e.com`,
    password: "12345",
    name: "X",
  });
  check("A3", r.status === 400 && r.body?.error?.details?.password, JSON.stringify(r.body));

  r = await anon.call("POST", "/auth/register", {
    email: "khong-hop-le",
    password: "matkhau123",
    name: "X",
  });
  check("A4", r.status === 400 && r.body?.error?.details?.email, JSON.stringify(r.body));

  r = await anon.call("POST", "/auth/register", {
    email: `y${stamp}@e.com`,
    password: "matkhau123",
    name: "Y",
    defaultCurrency: "XYZ",
  });
  check(
    "A5",
    r.status === 404 && r.body?.error?.code === "CURRENCY_NOT_SUPPORTED",
    `${r.status} ${JSON.stringify(r.body)}`,
  );

  r = await A.call("POST", "/auth/login", { email: emailA, password: "matkhau123" });
  check("A6", r.status === 200 && r.body?.data?.email === emailA, JSON.stringify(r.body));

  const wrongPass = await anon.call("POST", "/auth/login", {
    email: emailA,
    password: "sai-mat-khau",
  });
  check(
    "A7",
    wrongPass.status === 401 && wrongPass.body?.error?.code === "INVALID_CREDENTIALS",
    JSON.stringify(wrongPass.body),
  );

  const noUser = await anon.call("POST", "/auth/login", {
    email: `khong-ton-tai-${stamp}@e.com`,
    password: "matkhau123",
  });
  // Sai email và sai mật khẩu phải trả cùng thông điệp, nếu không sẽ dò được
  // email nào đã đăng ký.
  check(
    "A8",
    noUser.status === 401 && noUser.body?.error?.message === wrongPass.body?.error?.message,
    "thông điệp phải giống nhau để không dò được email",
  );

  r = await A.call("GET", "/auth/me");
  check("A9", r.status === 200 && r.body?.data?.email === emailA, JSON.stringify(r.body));

  r = await anon.call("GET", "/auth/me");
  check("A10", r.status === 401 && r.body?.error?.code === "UNAUTHORIZED", JSON.stringify(r.body));

  r = await A.call("PATCH", "/auth/me", { name: "User A đã đổi tên" });
  check(
    "A11",
    r.status === 200 && r.body?.data?.name === "User A đã đổi tên",
    JSON.stringify(r.body),
  );

  r = await A.call("PATCH", "/auth/me", {});
  check("A12", r.status === 400, JSON.stringify(r.body));

  // A13/A14: đăng nhập ở "thiết bị" thứ hai rồi logout đúng phiên đó.
  const secondDevice = makeClient("A-2");
  await secondDevice.call("POST", "/auth/login", { email: emailA, password: "matkhau123" });
  r = await secondDevice.call("POST", "/auth/logout");
  check("A13-logout", r.status === 204, `${r.status}`);
  r = await secondDevice.call("GET", "/auth/me");
  check("A13", r.status === 401, "cookie cũ vẫn dùng được sau logout");
  r = await A.call("GET", "/auth/me");
  check("A14", r.status === 200, "logout một thiết bị làm mất phiên thiết bị khác");

  // User B tồn tại để các module sau kiểm chứng dữ liệu tách bạch giữa hai user.
  await B.call("POST", "/auth/register", {
    email: emailB,
    password: "matkhau123",
    name: "User B",
  });
}
