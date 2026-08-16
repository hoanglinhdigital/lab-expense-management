/**
 * Chạy toàn bộ bộ test API trong một lượt, dùng chung một bộ dữ liệu.
 *
 *   k6 run test/all.test.js
 *   k6 run -e API_BASE_URL=http://localhost:3005/api test/all.test.js
 *
 * Cần một dev server đang chạy (`npm run dev`).
 *
 * Bộ test chạy trên database thật và tự sinh dữ liệu mới mỗi lần chạy (mọi tên
 * và email đều gắn timestamp), nên chạy lại nhiều lần không đụng ràng buộc trùng
 * tên. Dữ liệu test **không** được dọn sau khi chạy — chỉ dùng ở môi trường dev.
 *
 * Muốn chạy riêng một module thì gọi thẳng file của nó, mỗi file tự dựng dữ liệu
 * nền cần thiết:
 *
 *   k6 run test/account/account.test.js
 */

import { BASE_URL, waitForServer } from "./lib/http.js";
import { createContext } from "./lib/fixtures.js";
import { moduleGroup } from "./lib/expect.js";
import { baseOptions } from "./lib/options.js";

import * as auth from "./auth/auth.test.js";
import * as currency from "./currency/currency.test.js";
import * as account from "./account/account.test.js";
import * as category from "./category/category.test.js";
import * as contact from "./contact/contact.test.js";
import * as transaction from "./transaction/transaction.test.js";
import * as report from "./report/report.test.js";

export const options = baseOptions;

/**
 * Thứ tự khai báo cũng là thứ tự chạy. Các module dùng chung fixture trong `ctx`
 * (xem `test/lib/fixtures.js`) nên không hoán đổi vị trí được.
 */
const MODULES = [auth, currency, account, category, contact, transaction, report];

export default function main() {
  console.log(`Server: ${BASE_URL}`);
  console.log(`Module: ${MODULES.map((m) => m.name).join(" -> ")}`);

  if (!waitForServer()) {
    throw new Error(`không kết nối được tới ${BASE_URL} — chạy \`npm run dev\` trước`);
  }

  const ctx = createContext();
  const pending = [];

  for (const testModule of MODULES) {
    moduleGroup(testModule.name, () => testModule.run(ctx));

    if (typeof testModule.runAfterTransactions === "function") pending.push(testModule);

    // Một số ràng buộc chỉ kiểm chứng được khi đã có giao dịch tham chiếu (xoá
    // account còn giao dịch, tổng công nợ của contact...). Chúng nằm trong đúng
    // module của mình nhưng phải đợi module transaction chạy xong.
    if (testModule === transaction) {
      for (const owner of pending.splice(0)) {
        moduleGroup(`${owner.name} (sau giao dịch)`, () => owner.runAfterTransactions(ctx));
      }
    }
  }
}
