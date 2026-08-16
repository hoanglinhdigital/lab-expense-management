/**
 * Context và fixture dùng chung giữa các script test.
 *
 * Bộ test chạy trên database thật, không mock: transaction cần
 * account/category/contact có sẵn, report cần transaction có sẵn. Bản Node
 * trước đây giải quyết bằng cách ép thứ tự chạy trong `run.mjs`, nên không file
 * nào chạy lẻ được.
 *
 * Ở bản k6 mỗi file phải chạy được một mình bằng `k6 run <file>`, nên dữ liệu
 * nền được đóng thành các hàm `bootstrap*()` dưới đây. Mỗi hàm chỉ dựng đúng
 * phần mình phụ trách và **idempotent trong một lần chạy**: module test nào đã
 * tự dựng (kèm check) thì bootstrap thấy cờ trong `ctx.ready` và bỏ qua, nhờ vậy
 * `test/all.test.js` không dựng lại dữ liệu lần hai.
 */

import { makeClient } from "./http.js";

export function createContext() {
  // Mốc thời gian làm hậu tố cho mọi tên/email, để chạy lại nhiều lần trên cùng
  // một database mà không đụng ràng buộc trùng tên.
  const stamp = Date.now();

  return {
    stamp,
    dateNow: new Date().toISOString(),

    /** A: người dùng chính. B: người dùng khác, để test tách bạch dữ liệu. */
    A: makeClient("A"),
    B: makeClient("B"),
    /** Client không đăng nhập, dùng cho các case `401`. */
    anon: makeClient("anon"),

    emailA: `test-a-${stamp}@example.com`,
    emailB: `test-b-${stamp}@example.com`,

    // Fixture do module test hoặc hàm bootstrap ghi vào.
    accounts: {},
    categories: {},
    contacts: {},
    transactions: {},

    /** Cờ đánh dấu phần dữ liệu nền đã dựng — xem phần `bootstrap*` bên dưới. */
    ready: {},

    /** Số dư hiện tại của một account, dạng object đầy đủ. */
    balance(accountId) {
      const res = this.A.call("GET", `/accounts/${accountId}/balance`);
      return res.body ? res.body.data : null;
    },

    /** Số dư hiện tại của một account, dạng số. */
    balanceOf(accountId) {
      return Number(this.balance(accountId).currentBalance);
    },
  };
}

/** Đăng ký user A và user B. Không check — phần kiểm chứng nằm ở `auth.test.js`. */
export function bootstrapAuth(ctx) {
  if (ctx.ready.auth) return ctx;

  ctx.A.call("POST", "/auth/register", {
    email: ctx.emailA,
    password: "matkhau123",
    name: "User A",
    defaultCurrency: "VND",
  });
  ctx.B.call("POST", "/auth/register", {
    email: ctx.emailB,
    password: "matkhau123",
    name: "User B",
  });

  ctx.ready.auth = true;
  return ctx;
}

/** Ba account của user A: tiền mặt VND, ngân hàng VND, ngân hàng USD. */
export function bootstrapAccounts(ctx) {
  if (ctx.ready.accounts) return ctx;
  bootstrapAuth(ctx);

  const cash = ctx.A.call("POST", "/accounts", {
    name: "Ví tiền mặt",
    type: "CASH",
    currency: "VND",
    initialBalance: "1000000",
    isDefault: true,
  }).body.data;

  const bank = ctx.A.call("POST", "/accounts", {
    name: "Vietcombank",
    type: "BANK_ACCOUNT",
    currency: "VND",
    initialBalance: "5000000",
    isDefault: true,
  }).body.data;

  const usd = ctx.A.call("POST", "/accounts", {
    name: "Tài khoản USD",
    type: "BANK_ACCOUNT",
    currency: "USD",
    initialBalance: "100",
  }).body.data;

  ctx.accounts = { cash, bank, usd };
  ctx.ready.accounts = true;
  return ctx;
}

/**
 * Danh mục hệ thống. Không tạo mới gì cả — danh mục `SYSTEM` do seed sinh ra,
 * mọi user đều đọc được. Danh mục `USER` là việc của `category.test.js`.
 */
export function bootstrapCategories(ctx) {
  if (ctx.ready.categories) return ctx;
  bootstrapAuth(ctx);

  const system = ctx.A.call("GET", "/categories?scope=SYSTEM&pageSize=200").body.data;

  ctx.categories = {
    system,
    sysExpense: system.find((c) => c.type === "EXPENSE"),
    sysIncome: system.find((c) => c.type === "INCOME"),
  };
  ctx.ready.categories = true;
  return ctx;
}

/** Hai contact: `minh` dùng cho BORROW, `lan` dùng cho LEND. */
export function bootstrapContacts(ctx) {
  if (ctx.ready.contacts) return ctx;
  bootstrapAuth(ctx);

  const minh = ctx.A.call("POST", "/contacts", { name: `Anh Minh ${ctx.stamp}` }).body.data;
  const lan = ctx.A.call("POST", "/contacts", {
    name: `Chị Lan ${ctx.stamp}`,
    phone: "0901234567",
  }).body.data;

  ctx.contacts = { minh, lan };
  ctx.ready.contacts = true;
  return ctx;
}

/**
 * Giao dịch nền cho các case "sau giao dịch".
 *
 * Cố ý chỉ dựng đúng một BORROW và một LEND, không dựng INCOME/EXPENSE:
 * - BORROW 300.000 và LEND 100.000 cùng trên account tiền mặt, đủ để `totalIn`
 *   và `totalOut` của account đều khác 0 (B17) và account không xoá được (B15).
 * - Đúng bằng số liệu mà D8/D9 và H23 đối chiếu.
 * - Không có INCOME/EXPENSE nào lẫn vào để `report.test.js` chạy lẻ vẫn ra đúng
 *   con số của riêng nó (H16-value).
 *
 * Đây cũng chính là phần còn sót lại sau khi `transaction.test.js` chạy xong
 * (E29 xoá giao dịch INCOME, E27 đổi giao dịch EXPENSE thành TRANSFER), nên chạy
 * lẻ hay chạy trọn bộ đều cho cùng kết quả.
 */
export function bootstrapTransactions(ctx) {
  if (ctx.ready.transactions) return ctx;
  bootstrapAccounts(ctx);
  bootstrapContacts(ctx);

  const borrow = ctx.A.call("POST", "/transactions", {
    type: "BORROW",
    amount: "300000",
    date: ctx.dateNow,
    fromAccountId: ctx.accounts.cash.id,
    contactId: ctx.contacts.minh.id,
  }).body.data;

  const lend = ctx.A.call("POST", "/transactions", {
    type: "LEND",
    amount: "100000",
    date: ctx.dateNow,
    fromAccountId: ctx.accounts.cash.id,
    contactId: ctx.contacts.lan.id,
  }).body.data;

  ctx.transactions = { borrow, lend };
  ctx.ready.transactions = true;
  return ctx;
}
