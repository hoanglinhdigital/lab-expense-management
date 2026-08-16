/**
 * Test case E1–E32 — `plans/backend/05_transaction.md`, spec `docs/api-spec/transaction.yaml`.
 *
 * Hai trọng tâm:
 * 1. Ràng buộc field theo `type` — field thiếu hoặc thừa đều phải `400`.
 * 2. Số dư dịch đúng chiều sau mỗi thao tác ghi, kể cả khi sửa/xoá.
 *
 * Module này làm thay đổi dữ liệu của account/category/contact nên chạy sau cả ba.
 */

export const name = "transaction";
export const deps = ["auth", "account", "category", "contact"];

export async function run(ctx) {
  const { A, B, check, dateNow, accounts, categories, contacts } = ctx;
  const { cash, bank, usd } = accounts;
  const { sysExpense, sysIncome } = categories;
  const balanceOf = (id) => ctx.balanceOf(id);

  const cashStart = await balanceOf(cash.id);

  let r = await A.call("POST", "/transactions", {
    type: "INCOME",
    amount: "500000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysIncome.id,
  });
  const income = r.body?.data;
  check("E1", r.status === 201 && (await balanceOf(cash.id)) === cashStart + 500000, JSON.stringify(r.body));

  r = await A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "45000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  const expense = r.body?.data;
  check(
    "E2",
    r.status === 201 && (await balanceOf(cash.id)) === cashStart + 500000 - 45000,
    JSON.stringify(r.body),
  );

  // TRANSFER cùng tiền tệ: tổng số dư hai account phải không đổi.
  const bankBefore = await balanceOf(bank.id);
  const cashBefore = await balanceOf(cash.id);
  r = await A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "200000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: cash.id,
  });
  const bankAfter = await balanceOf(bank.id);
  const cashAfter = await balanceOf(cash.id);
  check(
    "E3",
    r.status === 201 && bankAfter === bankBefore - 200000 && cashAfter === cashBefore + 200000,
    `bank ${bankBefore}->${bankAfter}, cash ${cashBefore}->${cashAfter}`,
  );
  check("E3-sum", bankAfter + cashAfter === bankBefore + cashBefore, "tổng số dư 2 account phải không đổi");

  // TRANSFER khác tiền tệ: account đích cộng `receiveAmount`, không phải `amount`.
  const usdBefore = await balanceOf(usd.id);
  r = await A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "1000000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: usd.id,
    receiveAmount: "39.37",
  });
  const usdAfter = await balanceOf(usd.id);
  check("E4", r.status === 201 && Math.abs(usdAfter - (usdBefore + 39.37)) < 0.001, `usd ${usdBefore}->${usdAfter}`);

  r = await A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "1000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: usd.id,
  });
  check("E5", r.status === 400 && r.body?.error?.details?.receiveAmount, JSON.stringify(r.body));

  r = await A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "1000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: cash.id,
    receiveAmount: "999",
  });
  check("E6", r.status === 400 && r.body?.error?.details?.receiveAmount, JSON.stringify(r.body));

  const beforeBorrow = await balanceOf(cash.id);
  r = await A.call("POST", "/transactions", {
    type: "BORROW",
    amount: "300000",
    date: dateNow,
    fromAccountId: cash.id,
    contactId: contacts.minh.id,
  });
  const borrow = r.body?.data;
  check("E7", r.status === 201 && (await balanceOf(cash.id)) === beforeBorrow + 300000, "BORROW phải làm tăng số dư");

  const beforeLend = await balanceOf(cash.id);
  r = await A.call("POST", "/transactions", {
    type: "LEND",
    amount: "100000",
    date: dateNow,
    fromAccountId: cash.id,
    contactId: contacts.lan.id,
  });
  check("E8", r.status === 201 && (await balanceOf(cash.id)) === beforeLend - 100000, "LEND phải làm giảm số dư");

  ctx.transactions = { income, expense, borrow };

  // --- Ràng buộc field theo type -------------------------------------------

  r = await A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "1000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysIncome.id,
  });
  check("E9", r.status === 400 && r.body?.error?.details?.categoryId, JSON.stringify(r.body));

  r = await A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "1000",
    date: dateNow,
    fromAccountId: cash.id,
  });
  check("E10", r.status === 400, JSON.stringify(r.body));

  r = await A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "1000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  check("E11", r.status === 400, JSON.stringify(r.body));

  r = await A.call("POST", "/transactions", {
    type: "BORROW",
    amount: "1000",
    date: dateNow,
    fromAccountId: cash.id,
  });
  check("E12", r.status === 400, JSON.stringify(r.body));

  r = await B.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "1000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  check("E13", r.status === 404, `${r.status} ${JSON.stringify(r.body)}`);

  check("E14", expense?.category?.id === sysExpense.id, "không dùng được category SYSTEM");

  r = await A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "0",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  check("E15", r.status === 400 && r.body?.error?.details?.amount, JSON.stringify(r.body));

  r = await A.call("POST", "/transactions", {
    type: "TRANSFER",
    amount: "1000",
    date: dateNow,
    fromAccountId: cash.id,
    toAccountId: cash.id,
  });
  check("E16", r.status === 400, JSON.stringify(r.body));

  // --- Danh sách & bộ lọc ---------------------------------------------------

  r = await A.call("GET", "/transactions");
  const dates = (r.body?.data ?? []).map((t) => new Date(t.date).getTime());
  check("E17", r.status === 200 && dates.every((v, i) => i === 0 || dates[i - 1] >= v), "sort date_desc sai");

  r = await A.call("GET", `/transactions?accountId=${cash.id}`);
  check(
    "E18",
    r.status === 200 && r.body.data.some((t) => t.toAccount?.id === cash.id),
    "không gộp giao dịch account là đích",
  );

  r = await A.call("GET", `/transactions?categoryId=${sysExpense.id}&includeChildCategories=true`);
  check("E19", r.status === 200, JSON.stringify(r.body?.meta));

  r = await A.call("GET", "/transactions?type=INCOME&type=EXPENSE");
  check(
    "E20",
    r.status === 200 && r.body.data.every((t) => ["INCOME", "EXPENSE"].includes(t.type)),
    "lẫn loại khác",
  );

  r = await A.call("GET", "/transactions?dateFrom=2026-12-01T00:00:00Z&dateTo=2026-01-01T00:00:00Z");
  check("E21", r.status === 400 && r.body?.error?.details?.dateFrom, JSON.stringify(r.body));

  // meta phải tính trên toàn bộ kết quả khớp bộ lọc, không chỉ trang hiện tại.
  r = await A.call("GET", "/transactions?pageSize=1");
  check(
    "E22",
    r.status === 200 &&
      r.body.data.length === 1 &&
      r.body.meta.total > 1 &&
      Number(r.body.meta.totalIncome) >= 500000,
    `meta=${JSON.stringify(r.body?.meta)}`,
  );

  const all = await A.call("GET", "/transactions?pageSize=100");
  const transferSum = all.body.data
    .filter((t) => t.type === "TRANSFER")
    .reduce((s, t) => s + Number(t.amount), 0);
  check(
    "E23",
    transferSum > 0 && Number(all.body.meta.totalIncome) === 500000,
    `TRANSFER (${transferSum}) không được cộng vào totalIncome=${all.body.meta.totalIncome}`,
  );

  r = await A.call("GET", `/transactions/${expense.id}`);
  check(
    "E24",
    r.status === 200 &&
      r.body.data.fromAccount?.id === cash.id &&
      r.body.data.currency === "VND" &&
      r.body.data.category?.id === sysExpense.id,
    JSON.stringify(r.body?.data),
  );

  // --- Sửa & xoá ------------------------------------------------------------

  const beforeAmountChange = await balanceOf(cash.id);
  r = await A.call("PATCH", `/transactions/${expense.id}`, {
    type: "EXPENSE",
    amount: "65000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  check(
    "E25",
    r.status === 200 && (await balanceOf(cash.id)) === beforeAmountChange - 20000,
    "sửa amount không dịch đúng số dư",
  );

  const cashBeforeMove = await balanceOf(cash.id);
  const bankBeforeMove = await balanceOf(bank.id);
  r = await A.call("PATCH", `/transactions/${expense.id}`, {
    type: "EXPENSE",
    amount: "65000",
    date: dateNow,
    fromAccountId: bank.id,
    categoryId: sysExpense.id,
  });
  check(
    "E26",
    r.status === 200 &&
      (await balanceOf(cash.id)) === cashBeforeMove + 65000 &&
      (await balanceOf(bank.id)) === bankBeforeMove - 65000,
    "đổi fromAccountId không hoàn nguyên account cũ",
  );

  r = await A.call("PATCH", `/transactions/${expense.id}`, {
    type: "TRANSFER",
    amount: "65000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: cash.id,
  });
  check("E27", r.status === 200 && r.body.data.type === "TRANSFER" && r.body.data.category === null, JSON.stringify(r.body?.data));

  r = await A.call("PATCH", `/transactions/${expense.id}`, {
    type: "TRANSFER",
    amount: "65000",
    date: dateNow,
    fromAccountId: bank.id,
    toAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  check("E28", r.status === 400, JSON.stringify(r.body));

  const beforeDelete = await balanceOf(cash.id);
  r = await A.call("DELETE", `/transactions/${income.id}`);
  check(
    "E29",
    r.status === 204 && (await balanceOf(cash.id)) === beforeDelete - 500000,
    "xoá không hoàn nguyên số dư",
  );

  r = await A.call("DELETE", `/transactions/${income.id}`);
  check("E30", r.status === 404, `${r.status}`);

  r = await B.call("GET", `/transactions/${borrow.id}`);
  check("E31", r.status === 404 && r.body?.error?.code === "TRANSACTION_NOT_FOUND", JSON.stringify(r.body));
}
