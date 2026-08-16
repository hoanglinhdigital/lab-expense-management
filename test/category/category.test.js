/**
 * Test case C1–C24 — `plans/backend/03_category.md`, spec `docs/api-spec/category.yaml`.
 *
 * Chạy lẻ:  k6 run test/category/category.test.js
 *
 * Cung cấp: `ctx.categories.sysExpense`, `.sysIncome`, `.coffee`, `.child`.
 *
 * Trọng tâm của module: danh mục `SYSTEM` mọi user đều đọc được nhưng không ai
 * sửa/xoá được, và danh mục `USER` chỉ chủ sở hữu thấy.
 */

import { waitForServer } from "../lib/http.js";
import { createContext, bootstrapAuth, bootstrapTransactions } from "../lib/fixtures.js";
import { expect, moduleGroup } from "../lib/expect.js";
import { baseOptions } from "../lib/options.js";

export const options = baseOptions;
export const name = "category";

export function run(ctx) {
  const { A, B, stamp } = ctx;

  let r = A.call("GET", "/categories?scope=SYSTEM&pageSize=200");
  const system = r.body?.data ?? [];
  expect("C1", r.status === 200 && system.length === 11, `có ${system.length} danh mục SYSTEM`);
  expect("C3", system.every((c) => c.scope === "SYSTEM"), "lẫn danh mục không phải SYSTEM");

  const sysExpense = system.find((c) => c.type === "EXPENSE");
  const sysIncome = system.find((c) => c.type === "INCOME");

  r = A.call("POST", "/categories", {
    name: `Cà phê ${stamp}`,
    type: "EXPENSE",
    icon: "☕",
    color: "#e11d48",
  });
  const coffee = r.body?.data;
  expect("C8", r.status === 201 && coffee?.scope === "USER", JSON.stringify(r.body));

  r = B.call("GET", "/categories?scope=USER");
  expect("C2", r.status === 200 && !r.body.data.some((c) => c.id === coffee.id), "user B thấy danh mục của A");

  r = A.call("GET", "/categories?type=INCOME&pageSize=200");
  expect("C4", r.status === 200 && r.body.data.every((c) => c.type === "INCOME"), "lẫn danh mục EXPENSE");

  r = A.call("GET", "/categories?parentId=&pageSize=200");
  expect("C5", r.status === 200 && r.body.data.every((c) => c.parentId === null), "lẫn danh mục con");

  // Danh mục cha có thể là SYSTEM, miễn cùng type và là danh mục gốc.
  r = A.call("POST", "/categories", {
    name: `Cà phê sáng ${stamp}`,
    type: "EXPENSE",
    parentId: sysExpense.id,
  });
  const child = r.body?.data;
  expect("C9", r.status === 201 && child?.parentId === sysExpense.id, JSON.stringify(r.body));

  ctx.categories = { system, sysExpense, sysIncome, coffee, child };
  ctx.ready.categories = true;

  r = A.call("GET", "/categories?tree=true&pageSize=200");
  const roots = r.body?.data ?? [];
  expect(
    "C6",
    r.status === 200 && roots.every((c) => c.parentId === null && Array.isArray(c.children)),
    "tree=true trả sai cấu trúc",
  );
  expect(
    "C6-child",
    roots.some((c) => c.children.some((x) => x.id === child.id)),
    "danh mục con không nằm trong children",
  );

  r = A.call("POST", "/categories", { name: `Sai type ${stamp}`, type: "INCOME", parentId: sysExpense.id });
  expect("C10", r.status === 400 && r.body?.error?.details?.parentId, JSON.stringify(r.body));

  r = A.call("POST", "/categories", { name: `Cấp 3 ${stamp}`, type: "EXPENSE", parentId: child.id });
  expect("C11", r.status === 400, JSON.stringify(r.body));

  r = A.call("POST", "/categories", { name: `Cha lạ ${stamp}`, type: "EXPENSE", parentId: "khong-ton-tai" });
  expect("C12", r.status === 404 && r.body?.error?.code === "PARENT_CATEGORY_NOT_FOUND", JSON.stringify(r.body));

  r = A.call("POST", "/categories", { name: `Cà phê ${stamp}`, type: "EXPENSE" });
  expect("C13", r.status === 409 && r.body?.error?.code === "CATEGORY_NAME_DUPLICATED", JSON.stringify(r.body));

  // Trùng tên nhưng khác type là hợp lệ — unique key gồm cả `type`.
  r = A.call("POST", "/categories", { name: `Cà phê ${stamp}`, type: "INCOME" });
  const coffeeIncome = r.body?.data;
  expect("C14", r.status === 201, JSON.stringify(r.body));
  ctx.categories.coffeeIncome = coffeeIncome;

  r = A.call("PATCH", `/categories/${sysExpense.id}`, { name: "Đổi tên hệ thống" });
  expect("C15", r.status === 403 && r.body?.error?.code === "SYSTEM_CATEGORY_READONLY", JSON.stringify(r.body));

  r = B.call("PATCH", `/categories/${coffee.id}`, { name: "Của người khác" });
  expect("C16", r.status === 404 && r.body?.error?.code === "CATEGORY_NOT_FOUND", JSON.stringify(r.body));

  r = A.call("PATCH", `/categories/${coffee.id}`, { parentId: coffee.id });
  expect("C17", r.status === 400, JSON.stringify(r.body));

  r = A.call("DELETE", `/categories/${sysExpense.id}`);
  expect("C20", r.status === 403 && r.body?.error?.code === "SYSTEM_CATEGORY_READONLY", JSON.stringify(r.body));

  r = A.call("POST", "/categories", { name: `Màu sai ${stamp}`, type: "EXPENSE", color: "red" });
  expect("C24", r.status === 400 && r.body?.error?.details?.color, JSON.stringify(r.body));
}

/** Xoá danh mục — chỉ kiểm chứng đủ khi đã có giao dịch tham chiếu. */
export function runAfterTransactions(ctx) {
  const { A, categories } = ctx;

  // Danh mục sạch (không giao dịch, không con) thì xoá được.
  let r = A.call("DELETE", `/categories/${categories.coffeeIncome.id}`);
  expect("C23", r.status === 204, `${r.status}`);

  r = A.call("DELETE", `/categories/${categories.sysExpense.id}`);
  expect("C21-system", r.status === 403, `${r.status}`);

  r = A.call("DELETE", `/categories/${categories.child.id}`);
  expect("C22", r.status === 204, `${r.status} ${JSON.stringify(r.body)}`);
}

export default function main() {
  if (!waitForServer()) throw new Error("không kết nối được tới API — chạy `npm run dev` trước");

  const ctx = bootstrapAuth(createContext());

  moduleGroup(name, () => run(ctx));

  bootstrapTransactions(ctx);
  moduleGroup(`${name} (sau giao dịch)`, () => runAfterTransactions(ctx));
}
