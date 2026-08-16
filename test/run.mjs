/**
 * Chạy bộ test API.
 *
 *   node test/run.mjs                 # chạy tất cả module
 *   node test/run.mjs account         # chạy account (tự kéo theo module phụ thuộc)
 *   node test/run.mjs transaction report
 *
 * Cần một dev server đang chạy. Đổi địa chỉ bằng biến môi trường:
 *   API_BASE_URL=http://localhost:3005/api node test/run.mjs
 *
 * Bộ test chạy trên database thật và tự sinh dữ liệu mới mỗi lần chạy (mọi tên
 * và email đều gắn timestamp), nên chạy lại nhiều lần không đụng ràng buộc
 * trùng tên. Dữ liệu test **không** được dọn sau khi chạy — chỉ dùng ở môi
 * trường dev.
 */

import { BASE_URL, waitForServer } from "./lib/client.mjs";
import { createContext } from "./lib/context.mjs";
import { createReporter } from "./lib/reporter.mjs";

import * as auth from "./auth/auth.test.mjs";
import * as currency from "./currency/currency.test.mjs";
import * as account from "./account/account.test.mjs";
import * as category from "./category/category.test.mjs";
import * as contact from "./contact/contact.test.mjs";
import * as transaction from "./transaction/transaction.test.mjs";
import * as report from "./report/report.test.mjs";

/**
 * Thứ tự khai báo cũng là thứ tự chạy. Các module dùng chung fixture trong
 * `ctx` (xem `test/lib/context.mjs`) nên không hoán đổi vị trí được.
 */
const MODULES = [auth, currency, account, category, contact, transaction, report];

const BY_NAME = new Map(MODULES.map((m) => [m.name, m]));

/** Gom module được chọn cùng toàn bộ module nó phụ thuộc vào. */
function resolveSelection(names) {
  if (names.length === 0) return MODULES;

  const selected = new Set();

  const visit = (name) => {
    const found = BY_NAME.get(name);
    if (!found) {
      console.error(`Không có module test tên "${name}".`);
      console.error(`Chọn một trong: ${[...BY_NAME.keys()].join(", ")}`);
      process.exit(2);
    }
    if (selected.has(name)) return;
    for (const dep of found.deps) visit(dep);
    selected.add(name);
  };

  for (const name of names) visit(name);

  // Giữ đúng thứ tự khai báo, không theo thứ tự người dùng gõ.
  return MODULES.filter((m) => selected.has(m.name));
}

async function main() {
  const selection = resolveSelection(process.argv.slice(2));

  console.log(`Server: ${BASE_URL}`);
  console.log(`Module: ${selection.map((m) => m.name).join(" -> ")}`);

  if (!(await waitForServer())) {
    console.error(`\nKhông kết nối được tới ${BASE_URL}. Chạy \`npm run dev\` trước.`);
    process.exit(2);
  }

  const reporter = createReporter();
  const ctx = createContext(reporter);

  const pending = [];

  for (const testModule of selection) {
    reporter.startModule(testModule.name);
    await testModule.run(ctx);

    if (typeof testModule.runAfterTransactions === "function") pending.push(testModule);

    // Một số ràng buộc chỉ kiểm chứng được khi đã có giao dịch tham chiếu (xoá
    // account còn giao dịch, tổng công nợ của contact...). Chúng nằm trong đúng
    // module của mình nhưng phải đợi module transaction chạy xong.
    if (testModule === transaction) {
      for (const owner of pending.splice(0)) {
        reporter.startModule(`${owner.name} (sau giao dịch)`);
        await owner.runAfterTransactions(ctx);
      }
    }
  }

  if (pending.length > 0) {
    console.log(
      `\nBỏ qua phần "sau giao dịch" của: ${pending.map((m) => m.name).join(", ")}` +
        ` — thêm module transaction vào lệnh chạy để kiểm chứng đủ.`,
    );
  }

  process.exit(reporter.summary() ? 0 : 1);
}

main().catch((error) => {
  console.error("\nBộ test dừng vì lỗi ngoài dự kiến:");
  console.error(error);
  process.exit(2);
});
