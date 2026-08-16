/**
 * Test case B1–B21 — `plans/backend/02_account.md`, spec `docs/api-spec/account.yaml`.
 *
 * Chạy lẻ:  k6 run test/account/account.test.js
 *
 * Cung cấp: `ctx.accounts.cash`, `ctx.accounts.bank`, `ctx.accounts.usd`.
 *
 * Một phần test case (B12, B15–B21) chỉ có nghĩa khi account đã phát sinh giao
 * dịch, nên nằm ở `runAfterTransactions`. Chạy lẻ thì file này tự dựng giao dịch
 * nền; chạy trọn bộ thì `test/all.test.js` gọi sau module transaction.
 */

import { waitForServer } from "../lib/http.js";
import {
  createContext,
  bootstrapAuth,
  bootstrapContacts,
  bootstrapTransactions,
} from "../lib/fixtures.js";
import { expect, moduleGroup } from "../lib/expect.js";
import { baseOptions } from "../lib/options.js";

export const options = baseOptions;
export const name = "account";

export function run(ctx) {
  const { A, B } = ctx;

  let r = A.call("POST", "/accounts", {
    name: "Ví tiền mặt",
    type: "CASH",
    currency: "VND",
    initialBalance: "1000000",
    isDefault: true,
  });
  const cash = r.body?.data;
  expect("B1", r.status === 201 && cash?.currentBalance === "1000000.00", JSON.stringify(r.body));

  r = A.call("POST", "/accounts", { name: "Ví tiền mặt", type: "CASH", currency: "VND" });
  expect("B2", r.status === 409 && r.body?.error?.code === "ACCOUNT_NAME_DUPLICATED", JSON.stringify(r.body));

  r = A.call("POST", "/accounts", { name: "Sai tiền tệ", type: "CASH", currency: "XYZ" });
  expect(
    "B3",
    r.status === 404 && r.body?.error?.code === "CURRENCY_NOT_SUPPORTED",
    `${r.status} ${JSON.stringify(r.body)}`,
  );

  r = A.call("POST", "/accounts", {
    name: "Vietcombank",
    type: "BANK_ACCOUNT",
    currency: "VND",
    initialBalance: "5000000",
    isDefault: true,
  });
  const bank = r.body?.data;

  // Đặt isDefault cho account mới phải tự bỏ cờ ở account cũ.
  r = A.call("GET", "/accounts");
  const defaults = r.body.data.filter((a) => a.isDefault);
  expect(
    "B4",
    defaults.length === 1 && defaults[0].id === bank.id,
    JSON.stringify(defaults.map((d) => d.name)),
  );

  r = A.call("POST", "/accounts", {
    name: "Tài khoản USD",
    type: "BANK_ACCOUNT",
    currency: "USD",
    initialBalance: "100",
  });
  const usd = r.body?.data;
  expect("B0-usd", r.status === 201, JSON.stringify(r.body));

  ctx.accounts = { cash, bank, usd };
  ctx.ready.accounts = true;

  r = B.call("GET", "/accounts");
  expect("B5", r.status === 200 && r.body.meta.total === 0, `user B thấy ${r.body?.meta?.total} account của người khác`);

  r = A.call("GET", "/accounts?type=CASH&type=BANK_ACCOUNT");
  expect("B6", r.status === 200 && r.body.meta.total === 3, JSON.stringify(r.body?.meta));

  r = A.call("GET", "/accounts?sort=balance_desc");
  const balances = r.body.data.map((a) => Number(a.currentBalance));
  expect("B7", balances.every((v, i) => i === 0 || balances[i - 1] >= v), JSON.stringify(balances));

  r = A.call("GET", "/accounts?keyword=");
  expect("B8", r.status === 200 && r.body.meta.total === 3, JSON.stringify(r.body?.meta));

  r = A.call("GET", "/accounts?pageSize=101");
  expect("B9", r.status === 400, `${r.status}`);

  r = B.call("GET", `/accounts/${cash.id}`);
  expect("B10", r.status === 404 && r.body?.error?.code === "ACCOUNT_NOT_FOUND", JSON.stringify(r.body));

  r = A.call("PATCH", `/accounts/${cash.id}`, { initialBalance: "1500000" });
  expect("B11", r.status === 200 && r.body.data.currentBalance === "1500000.00", JSON.stringify(r.body?.data));

  r = A.call("PATCH", `/accounts/${cash.id}`, {});
  expect("B13", r.status === 400, `${r.status}`);

  r = A.call("POST", "/accounts", { name: "Sẽ xoá", type: "OTHER", currency: "VND" });
  const disposable = r.body.data;
  r = A.call("DELETE", `/accounts/${disposable.id}`);
  expect("B14", r.status === 204, `${r.status}`);
  r = A.call("GET", `/accounts/${disposable.id}`);
  expect("B14-gone", r.status === 404, `${r.status}`);
}

/** Các ràng buộc chỉ kiểm chứng được khi account đã có giao dịch. */
export function runAfterTransactions(ctx) {
  const { A, accounts } = ctx;

  let r = A.call("DELETE", `/accounts/${accounts.cash.id}`);
  expect(
    "B15",
    r.status === 409 &&
      r.body?.error?.code === "ACCOUNT_HAS_TRANSACTIONS" &&
      r.body.error.details.transactionCount > 0,
    JSON.stringify(r.body),
  );

  r = A.call("PATCH", `/accounts/${accounts.cash.id}`, { currency: "USD" });
  expect("B12", r.status === 409 && r.body?.error?.code === "ACCOUNT_CURRENCY_LOCKED", JSON.stringify(r.body));

  const cashBalance = ctx.balance(accounts.cash.id);
  expect(
    "B17",
    Number(cashBalance.totalIn) > 0 &&
      Number(cashBalance.totalOut) > 0 &&
      Number(cashBalance.currentBalance) ===
        Number(cashBalance.initialBalance) + Number(cashBalance.totalIn) - Number(cashBalance.totalOut),
    JSON.stringify(cashBalance),
  );

  r = A.call("GET", `/accounts/${accounts.cash.id}/balance?asOf=2020-01-01T00:00:00Z`);
  expect(
    "B18",
    r.status === 200 &&
      r.body.data.currentBalance === r.body.data.initialBalance &&
      r.body.data.totalIn === "0.00",
    JSON.stringify(r.body?.data),
  );

  r = A.call("GET", `/accounts/${accounts.cash.id}/balance?asOf=khong-phai-ngay`);
  expect("B-asOf", r.status === 400, `${r.status}`);

  r = A.call("GET", "/accounts/summary");
  expect(
    "B20",
    r.status === 200 &&
      r.body.data.currency === "VND" &&
      r.body.data.groups.length >= 2 &&
      r.body.data.groups[0].label,
    JSON.stringify(r.body?.data?.groups?.map((g) => [g.type, g.subtotal])),
  );

  r = A.call("GET", "/accounts/summary?currency=XYZ");
  expect("B21", r.status === 404 && r.body?.error?.code === "CURRENCY_NOT_SUPPORTED", JSON.stringify(r.body));
}

export default function main() {
  if (!waitForServer()) throw new Error("không kết nối được tới API — chạy `npm run dev` trước");

  const ctx = bootstrapAuth(createContext());

  moduleGroup(name, () => run(ctx));

  bootstrapContacts(ctx);
  bootstrapTransactions(ctx);
  moduleGroup(`${name} (sau giao dịch)`, () => runAfterTransactions(ctx));
}
