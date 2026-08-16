/**
 * Test case E1–E32 — `plans/backend/05_transaction.md`, spec `docs/api-spec/transaction.yaml`.
 *
 * Chạy lẻ:  k6 run test/transaction/transaction.test.js
 *
 * Hai trọng tâm:
 * 1. Ràng buộc field theo `type` — field thiếu hoặc thừa đều phải `400`.
 * 2. Số dư dịch đúng chiều sau mỗi thao tác ghi, kể cả khi sửa/xoá.
 *
 * Module này làm thay đổi dữ liệu của account/category/contact nên cần cả ba có
 * sẵn trước khi chạy.
 */

import { waitForServer } from "../lib/http.js";
import {
  createContext,
  bootstrapAuth,
  bootstrapAccounts,
  bootstrapCategories,
  bootstrapContacts,
} from "../lib/fixtures.js";
import { expect, moduleGroup } from "../lib/expect.js";
import { baseOptions } from "../lib/options.js";

export const options = baseOptions;
export const name = "transaction";

export function run(ctx) {
  const { A, B, dateNow, accounts, categories, contacts } = ctx;
  const { cash, bank, usd } = accounts;
  const { sysExpense, sysIncome } = categories;
  const balanceOf = (id) => ctx.balanceOf(id);

  const cashStart = balanceOf(cash.id);

  let r = A.call("POST", "/transactions", {
    type: "INCOME",
    amount: "500000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysIncome.id,
  });
  const income = r.body?.data;
  expect("E1", r.status === 201 && balanceOf(cash.id) === cashStart + 500000, JSON.stringify(r.body));

  r = A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "45000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  const expense = r.body?.data;
  expect(
    "E2",
    r.status === 201 && balanceOf(cash.id) === cashStart + 500000 - 45000,
    JSON.stringify(r.body),
  );

  // TRANSFER cùng tiền tệ: tổng số dư hai account phải không đổi.
  const bankBefore = balanceOf(bank.id);
  const cashBefore = balanceOf(cash.id);
  r = A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "200000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: cash.id,
  });
  const bankAfter = balanceOf(bank.id);
  const cashAfter = balanceOf(cash.id);
  expect(
    "E3",
    r.status === 201 && bankAfter === bankBefore - 200000 && cashAfter === cashBefore + 200000,
    `bank ${bankBefore}->${bankAfter}, cash ${cashBefore}->${cashAfter}`,
  );
  expect("E3-sum", bankAfter + cashAfter === bankBefore + cashBefore, "tổng số dư 2 account phải không đổi");

  // TRANSFER khác tiền tệ: account đích cộng `receiveAmount`, không phải `amount`.
  const usdBefore = balanceOf(usd.id);
  r = A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "1000000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: usd.id,
    receiveAmount: "39.37",
  });
  const usdAfter = balanceOf(usd.id);
  expect("E4", r.status === 201 && Math.abs(usdAfter - (usdBefore + 39.37)) < 0.001, `usd ${usdBefore}->${usdAfter}`);

  r = A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "1000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: usd.id,
  });
  expect("E5", r.status === 400 && r.body?.error?.details?.receiveAmount, JSON.stringify(r.body));

  r = A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "1000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: cash.id,
    receiveAmount: "999",
  });
  expect("E6", r.status === 400 && r.body?.error?.details?.receiveAmount, JSON.stringify(r.body));

  const beforeBorrow = balanceOf(cash.id);
  r = A.call("POST", "/transactions", {
    type: "BORROW",
    amount: "300000",
    date: dateNow,
    fromAccountId: cash.id,
    contactId: contacts.minh.id,
  });
  const borrow = r.body?.data;
  expect("E7", r.status === 201 && balanceOf(cash.id) === beforeBorrow + 300000, "BORROW phải làm tăng số dư");

  const beforeLend = balanceOf(cash.id);
  r = A.call("POST", "/transactions", {
    type: "LEND",
    amount: "100000",
    date: dateNow,
    fromAccountId: cash.id,
    contactId: contacts.lan.id,
  });
  expect("E8", r.status === 201 && balanceOf(cash.id) === beforeLend - 100000, "LEND phải làm giảm số dư");

  ctx.transactions = { income, expense, borrow };
  // BORROW 300k + LEND 100k đã tồn tại — đúng phần dữ liệu nền mà
  // `bootstrapTransactions()` dựng, nên các module sau không cần dựng lại.
  ctx.ready.transactions = true;

  // --- Ràng buộc field theo type -------------------------------------------

  r = A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "1000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysIncome.id,
  });
  expect("E9", r.status === 400 && r.body?.error?.details?.categoryId, JSON.stringify(r.body));

  r = A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "1000",
    date: dateNow,
    fromAccountId: cash.id,
  });
  expect("E10", r.status === 400, JSON.stringify(r.body));

  r = A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "1000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  expect("E11", r.status === 400, JSON.stringify(r.body));

  r = A.call("POST", "/transactions", {
    type: "BORROW",
    amount: "1000",
    date: dateNow,
    fromAccountId: cash.id,
  });
  expect("E12", r.status === 400, JSON.stringify(r.body));

  r = B.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "1000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  expect("E13", r.status === 404, `${r.status} ${JSON.stringify(r.body)}`);

  expect("E14", expense?.category?.id === sysExpense.id, "không dùng được category SYSTEM");

  r = A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "0",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  expect("E15", r.status === 400 && r.body?.error?.details?.amount, JSON.stringify(r.body));

  r = A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "1000",
    date: dateNow,
    fromAccountId: cash.id,
    toAccountId: cash.id,
  });
  expect("E16", r.status === 400, JSON.stringify(r.body));

  // --- Danh sách & bộ lọc ---------------------------------------------------

  r = A.call("GET", "/transactions");
  const dates = (r.body?.data ?? []).map((t) => new Date(t.date).getTime());
  expect("E17", r.status === 200 && dates.every((v, i) => i === 0 || dates[i - 1] >= v), "sort date_desc sai");

  r = A.call("GET", `/transactions?accountId=${cash.id}`);
  expect(
    "E18",
    r.status === 200 && r.body.data.some((t) => t.toAccount?.id === cash.id),
    "không gộp giao dịch account là đích",
  );

  r = A.call("GET", `/transactions?categoryId=${sysExpense.id}&includeChildCategories=true`);
  expect("E19", r.status === 200, JSON.stringify(r.body?.meta));

  r = A.call("GET", "/transactions?type=INCOME&type=EXPENSE");
  expect(
    "E20",
    r.status === 200 && r.body.data.every((t) => ["INCOME", "EXPENSE"].includes(t.type)),
    "lẫn loại khác",
  );

  r = A.call("GET", "/transactions?dateFrom=2026-12-01T00:00:00Z&dateTo=2026-01-01T00:00:00Z");
  expect("E21", r.status === 400 && r.body?.error?.details?.dateFrom, JSON.stringify(r.body));

  // meta phải tính trên toàn bộ kết quả khớp bộ lọc, không chỉ trang hiện tại.
  r = A.call("GET", "/transactions?pageSize=1");
  expect(
    "E22",
    r.status === 200 &&
      r.body.data.length === 1 &&
      r.body.meta.total > 1 &&
      Number(r.body.meta.totalIncome) >= 500000,
    `meta=${JSON.stringify(r.body?.meta)}`,
  );

  const all = A.call("GET", "/transactions?pageSize=100");
  const transferSum = all.body.data
    .filter((t) => t.type === "TRANSFER")
    .reduce((s, t) => s + Number(t.amount), 0);
  expect(
    "E23",
    transferSum > 0 && Number(all.body.meta.totalIncome) === 500000,
    `TRANSFER (${transferSum}) không được cộng vào totalIncome=${all.body.meta.totalIncome}`,
  );

  r = A.call("GET", `/transactions/${expense.id}`);
  expect(
    "E24",
    r.status === 200 &&
      r.body.data.fromAccount?.id === cash.id &&
      r.body.data.currency === "VND" &&
      r.body.data.category?.id === sysExpense.id,
    JSON.stringify(r.body?.data),
  );

  // --- Sửa & xoá ------------------------------------------------------------

  const beforeAmountChange = balanceOf(cash.id);
  r = A.call("PATCH", `/transactions/${expense.id}`, {
    type: "EXPENSE",
    amount: "65000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  expect(
    "E25",
    r.status === 200 && balanceOf(cash.id) === beforeAmountChange - 20000,
    "sửa amount không dịch đúng số dư",
  );

  const cashBeforeMove = balanceOf(cash.id);
  const bankBeforeMove = balanceOf(bank.id);
  r = A.call("PATCH", `/transactions/${expense.id}`, {
    type: "EXPENSE",
    amount: "65000",
    date: dateNow,
    fromAccountId: bank.id,
    categoryId: sysExpense.id,
  });
  expect(
    "E26",
    r.status === 200 &&
      balanceOf(cash.id) === cashBeforeMove + 65000 &&
      balanceOf(bank.id) === bankBeforeMove - 65000,
    "đổi fromAccountId không hoàn nguyên account cũ",
  );

  r = A.call("PATCH", `/transactions/${expense.id}`, {
    type: "TRANSFER",
    amount: "65000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: cash.id,
  });
  expect("E27", r.status === 200 && r.body.data.type === "TRANSFER" && r.body.data.category === null, JSON.stringify(r.body?.data));

  r = A.call("PATCH", `/transactions/${expense.id}`, {
    type: "TRANSFER",
    amount: "65000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  expect("E28", r.status === 400, JSON.stringify(r.body));

  const beforeDelete = balanceOf(cash.id);
  r = A.call("DELETE", `/transactions/${income.id}`);
  expect(
    "E29",
    r.status === 204 && balanceOf(cash.id) === beforeDelete - 500000,
    "xoá không hoàn nguyên số dư",
  );

  r = A.call("DELETE", `/transactions/${income.id}`);
  expect("E30", r.status === 404, `${r.status}`);

  r = B.call("GET", `/transactions/${borrow.id}`);
  expect("E31", r.status === 404 && r.body?.error?.code === "TRANSACTION_NOT_FOUND", JSON.stringify(r.body));
}

export default function main() {
  if (!waitForServer()) throw new Error("không kết nối được tới API — chạy `npm run dev` trước");

  const ctx = createContext();
  bootstrapAuth(ctx);
  bootstrapAccounts(ctx);
  bootstrapCategories(ctx);
  bootstrapContacts(ctx);

  moduleGroup(name, () => run(ctx));
}
