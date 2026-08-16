/**
 * Test case B1–B21 — `plans/backend/02_account.md`, spec `docs/api-spec/account.yaml`.
 *
 * Cung cấp: `ctx.accounts.cash`, `ctx.accounts.bank`, `ctx.accounts.usd`.
 *
 * Một phần test case (B12, B15–B21) chỉ có nghĩa khi account đã phát sinh giao
 * dịch, nên nằm ở `runAfterTransactions` — `test/run.mjs` gọi sau module
 * transaction.
 */

export const name = "account";
export const deps = ["auth"];

export async function run(ctx) {
  const { A, B, check } = ctx;

  let r = await A.call("POST", "/accounts", {
    name: "Ví tiền mặt",
    type: "CASH",
    currency: "VND",
    initialBalance: "1000000",
    isDefault: true,
  });
  const cash = r.body?.data;
  check("B1", r.status === 201 && cash?.currentBalance === "1000000.00", JSON.stringify(r.body));

  r = await A.call("POST", "/accounts", { name: "Ví tiền mặt", type: "CASH", currency: "VND" });
  check("B2", r.status === 409 && r.body?.error?.code === "ACCOUNT_NAME_DUPLICATED", JSON.stringify(r.body));

  r = await A.call("POST", "/accounts", { name: "Sai tiền tệ", type: "CASH", currency: "XYZ" });
  check(
    "B3",
    r.status === 404 && r.body?.error?.code === "CURRENCY_NOT_SUPPORTED",
    `${r.status} ${JSON.stringify(r.body)}`,
  );

  r = await A.call("POST", "/accounts", {
    name: "Vietcombank",
    type: "BANK_ACCOUNT",
    currency: "VND",
    initialBalance: "5000000",
    isDefault: true,
  });
  const bank = r.body?.data;

  // Đặt isDefault cho account mới phải tự bỏ cờ ở account cũ.
  r = await A.call("GET", "/accounts");
  const defaults = r.body.data.filter((a) => a.isDefault);
  check(
    "B4",
    defaults.length === 1 && defaults[0].id === bank.id,
    JSON.stringify(defaults.map((d) => d.name)),
  );

  r = await A.call("POST", "/accounts", {
    name: "Tài khoản USD",
    type: "BANK_ACCOUNT",
    currency: "USD",
    initialBalance: "100",
  });
  const usd = r.body?.data;
  check("B0-usd", r.status === 201, JSON.stringify(r.body));

  ctx.accounts = { cash, bank, usd };

  r = await B.call("GET", "/accounts");
  check("B5", r.status === 200 && r.body.meta.total === 0, `user B thấy ${r.body?.meta?.total} account của người khác`);

  r = await A.call("GET", "/accounts?type=CASH&type=BANK_ACCOUNT");
  check("B6", r.status === 200 && r.body.meta.total === 3, JSON.stringify(r.body?.meta));

  r = await A.call("GET", "/accounts?sort=balance_desc");
  const balances = r.body.data.map((a) => Number(a.currentBalance));
  check("B7", balances.every((v, i) => i === 0 || balances[i - 1] >= v), JSON.stringify(balances));

  r = await A.call("GET", "/accounts?keyword=");
  check("B8", r.status === 200 && r.body.meta.total === 3, JSON.stringify(r.body?.meta));

  r = await A.call("GET", "/accounts?pageSize=101");
  check("B9", r.status === 400, `${r.status}`);

  r = await B.call("GET", `/accounts/${cash.id}`);
  check("B10", r.status === 404 && r.body?.error?.code === "ACCOUNT_NOT_FOUND", JSON.stringify(r.body));

  r = await A.call("PATCH", `/accounts/${cash.id}`, { initialBalance: "1500000" });
  check("B11", r.status === 200 && r.body.data.currentBalance === "1500000.00", JSON.stringify(r.body?.data));

  r = await A.call("PATCH", `/accounts/${cash.id}`, {});
  check("B13", r.status === 400, `${r.status}`);

  r = await A.call("POST", "/accounts", { name: "Sẽ xoá", type: "OTHER", currency: "VND" });
  const disposable = r.body.data;
  r = await A.call("DELETE", `/accounts/${disposable.id}`);
  check("B14", r.status === 204, `${r.status}`);
  r = await A.call("GET", `/accounts/${disposable.id}`);
  check("B14-gone", r.status === 404, `${r.status}`);
}

/** Các ràng buộc chỉ kiểm chứng được khi account đã có giao dịch. */
export async function runAfterTransactions(ctx) {
  const { A, check, accounts } = ctx;

  let r = await A.call("DELETE", `/accounts/${accounts.cash.id}`);
  check(
    "B15",
    r.status === 409 &&
      r.body?.error?.code === "ACCOUNT_HAS_TRANSACTIONS" &&
      r.body.error.details.transactionCount > 0,
    JSON.stringify(r.body),
  );

  r = await A.call("PATCH", `/accounts/${accounts.cash.id}`, { currency: "USD" });
  check("B12", r.status === 409 && r.body?.error?.code === "ACCOUNT_CURRENCY_LOCKED", JSON.stringify(r.body));

  const cashBalance = await ctx.balance(accounts.cash.id);
  check(
    "B17",
    Number(cashBalance.totalIn) > 0 &&
      Number(cashBalance.totalOut) > 0 &&
      Number(cashBalance.currentBalance) ===
        Number(cashBalance.initialBalance) + Number(cashBalance.totalIn) - Number(cashBalance.totalOut),
    JSON.stringify(cashBalance),
  );

  r = await A.call("GET", `/accounts/${accounts.cash.id}/balance?asOf=2020-01-01T00:00:00Z`);
  check(
    "B18",
    r.status === 200 &&
      r.body.data.currentBalance === r.body.data.initialBalance &&
      r.body.data.totalIn === "0.00",
    JSON.stringify(r.body?.data),
  );

  r = await A.call("GET", `/accounts/${accounts.cash.id}/balance?asOf=khong-phai-ngay`);
  check("B-asOf", r.status === 400, `${r.status}`);

  r = await A.call("GET", "/accounts/summary");
  check(
    "B20",
    r.status === 200 &&
      r.body.data.currency === "VND" &&
      r.body.data.groups.length >= 2 &&
      r.body.data.groups[0].label,
    JSON.stringify(r.body?.data?.groups?.map((g) => [g.type, g.subtotal])),
  );

  r = await A.call("GET", "/accounts/summary?currency=XYZ");
  check("B21", r.status === 404 && r.body?.error?.code === "CURRENCY_NOT_SUPPORTED", JSON.stringify(r.body));
}
