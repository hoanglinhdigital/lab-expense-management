/**
 * Test case D1–D15 — `plans/backend/04_contact.md`, spec `docs/api-spec/contact.yaml`.
 *
 * Chạy lẻ:  k6 run test/contact/contact.test.js
 *
 * Cung cấp: `ctx.contacts.minh` (dùng cho BORROW), `ctx.contacts.lan` (dùng cho LEND).
 */

import { waitForServer } from "../lib/http.js";
import { createContext, bootstrapAuth, bootstrapTransactions } from "../lib/fixtures.js";
import { expect, moduleGroup } from "../lib/expect.js";
import { baseOptions } from "../lib/options.js";

export const options = baseOptions;
export const name = "contact";

export function run(ctx) {
  const { A, B, stamp } = ctx;

  let r = A.call("POST", "/contacts", { name: `Anh Minh ${stamp}` });
  const minh = r.body?.data;
  expect("D1", r.status === 201 && minh?.phone === null && minh?.email === null, JSON.stringify(r.body));

  r = A.call("POST", "/contacts", { name: `Anh Minh ${stamp}` });
  expect("D2", r.status === 409 && r.body?.error?.code === "CONTACT_NAME_DUPLICATED", JSON.stringify(r.body));

  r = A.call("POST", "/contacts", { name: `Email sai ${stamp}`, email: "abc" });
  expect("D3", r.status === 400 && r.body?.error?.details?.email, JSON.stringify(r.body));

  r = A.call("POST", "/contacts", { name: `Phone sai ${stamp}`, phone: "abc" });
  expect("D4", r.status === 400 && r.body?.error?.details?.phone, JSON.stringify(r.body));

  r = A.call("POST", "/contacts", { name: `Chị Lan ${stamp}`, phone: "0901234567" });
  const lan = r.body?.data;

  ctx.contacts = { minh, lan };
  ctx.ready.contacts = true;

  r = B.call("GET", "/contacts");
  expect("D5", r.status === 200 && r.body.meta.total === 0, `user B thấy ${r.body?.meta?.total} contact của A`);

  r = A.call("GET", "/contacts?keyword=0901234567");
  expect(
    "D6",
    r.status === 200 && r.body.meta.total === 1 && r.body.data[0].id === lan.id,
    JSON.stringify(r.body?.data),
  );

  r = A.call("GET", "/contacts?sort=name_asc");
  const names = r.body.data.map((c) => c.name);
  expect("D7", names.every((v, i) => i === 0 || names[i - 1].localeCompare(v) <= 0), JSON.stringify(names));

  r = B.call("GET", `/contacts/${minh.id}`);
  expect("D10", r.status === 404 && r.body?.error?.code === "CONTACT_NOT_FOUND", JSON.stringify(r.body));

  // Gửi `null` tường minh là xoá giá trị, khác với không gửi field.
  r = A.call("PATCH", `/contacts/${lan.id}`, { phone: null });
  expect("D11", r.status === 200 && r.body.data.phone === null, JSON.stringify(r.body?.data));

  r = A.call("PATCH", `/contacts/${lan.id}`, {});
  expect("D12", r.status === 400, `${r.status}`);
}

/** Tổng công nợ và ràng buộc xoá — cần giao dịch BORROW/LEND đã tồn tại. */
export function runAfterTransactions(ctx) {
  const { A, contacts } = ctx;

  let r = A.call("DELETE", `/contacts/${contacts.minh.id}`);
  expect("D13", r.status === 409 && r.body?.error?.code === "CONTACT_HAS_TRANSACTIONS", JSON.stringify(r.body));

  r = A.call("GET", "/contacts?includeTotals=true");
  const minh = r.body.data.find((c) => c.id === contacts.minh.id);
  const lan = r.body.data.find((c) => c.id === contacts.lan.id);
  expect(
    "D8",
    Number(minh?.totalBorrow) === 300000 && Number(lan?.totalLend) === 100000,
    `minh=${JSON.stringify(minh)} lan=${JSON.stringify(lan)}`,
  );

  r = A.call("GET", `/contacts/${contacts.minh.id}`);
  expect(
    "D9",
    r.status === 200 && r.body.data.totalLend !== undefined && r.body.data.transactionCount === 1,
    JSON.stringify(r.body?.data),
  );
}

export default function main() {
  if (!waitForServer()) throw new Error("không kết nối được tới API — chạy `npm run dev` trước");

  const ctx = bootstrapAuth(createContext());

  moduleGroup(name, () => run(ctx));

  bootstrapTransactions(ctx);
  moduleGroup(`${name} (sau giao dịch)`, () => runAfterTransactions(ctx));
}
