/**
 * Context dùng chung giữa các module test.
 *
 * Bộ test chạy trên dữ liệu thật nên các module phụ thuộc lẫn nhau: transaction
 * cần account/category/contact có sẵn, report cần transaction có sẵn. Thay vì
 * mỗi module tự dựng lại toàn bộ dữ liệu, fixture được ghi vào context này và
 * module sau đọc lại. `test/run.mjs` lo phần thứ tự.
 */

import { makeClient } from "./client.mjs";

export function createContext(reporter) {
  // Mốc thời gian làm hậu tố cho mọi tên/email, để chạy lại nhiều lần trên cùng
  // một database mà không đụng ràng buộc trùng tên.
  const stamp = Date.now();

  return {
    stamp,
    dateNow: new Date().toISOString(),

    check: reporter.check,

    /** A: người dùng chính. B: người dùng khác, để test tách bạch dữ liệu. */
    A: makeClient("A"),
    B: makeClient("B"),
    /** Client không đăng nhập, dùng cho các case `401`. */
    anon: makeClient("anon"),

    emailA: `test-a-${stamp}@example.com`,
    emailB: `test-b-${stamp}@example.com`,

    // Fixture do các module ghi vào, xem phần khai báo `provides` ở mỗi module.
    accounts: {},
    categories: {},
    contacts: {},
    transactions: {},

    /** Số dư hiện tại của một account, dạng số. */
    async balance(accountId) {
      const res = await this.A.call("GET", `/accounts/${accountId}/balance`);
      return res.body?.data;
    },

    async balanceOf(accountId) {
      return Number((await this.balance(accountId)).currentBalance);
    },
  };
}
