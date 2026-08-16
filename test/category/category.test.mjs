/**
 * Test case C1–C24 — `plans/backend/03_category.md`, spec `docs/api-spec/category.yaml`.
 *
 * Cung cấp: `ctx.categories.sysExpense`, `.sysIncome`, `.coffee`, `.child`.
 *
 * Trọng tâm của module: danh mục `SYSTEM` mọi user đều đọc được nhưng không ai
 * sửa/xoá được, và danh mục `USER` chỉ chủ sở hữu thấy.
 */

export const name = "category";
export const deps = ["auth"];

export async function run(ctx) {
  const { A, B, check, stamp } = ctx;

  let r = await A.call("GET", "/categories?scope=SYSTEM&pageSize=200");
  const system = r.body?.data ?? [];
  check("C1", r.status === 200 && system.length === 11, `có ${system.length} danh mục SYSTEM`);
  check("C3", system.every((c) => c.scope === "SYSTEM"), "lẫn danh mục không phải SYSTEM");

  const sysExpense = system.find((c) => c.type === "EXPENSE");
  const sysIncome = system.find((c) => c.type === "INCOME");

  r = await A.call("POST", "/categories", {
    name: `Cà phê ${stamp}`,
    type: "EXPENSE",
    icon: "☕",
    color: "#e11d48",
  });
  const coffee = r.body?.data;
  check("C8", r.status === 201 && coffee?.scope === "USER", JSON.stringify(r.body));

  r = await B.call("GET", "/categories?scope=USER");
  check("C2", r.status === 200 && !r.body.data.some((c) => c.id === coffee.id), "user B thấy danh mục của A");

  r = await A.call("GET", "/categories?type=INCOME&pageSize=200");
  check("C4", r.status === 200 && r.body.data.every((c) => c.type === "INCOME"), "lẫn danh mục EXPENSE");

  r = await A.call("GET", "/categories?parentId=&pageSize=200");
  check("C5", r.status === 200 && r.body.data.every((c) => c.parentId === null), "lẫn danh mục con");

  // Danh mục cha có thể là SYSTEM, miễn cùng type và là danh mục gốc.
  r = await A.call("POST", "/categories", {
    name: `Cà phê sáng ${stamp}`,
    type: "EXPENSE",
    parentId: sysExpense.id,
  });
  const child = r.body?.data;
  check("C9", r.status === 201 && child?.parentId === sysExpense.id, JSON.stringify(r.body));

  ctx.categories = { system, sysExpense, sysIncome, coffee, child };

  r = await A.call("GET", "/categories?tree=true&pageSize=200");
  const roots = r.body?.data ?? [];
  check(
    "C6",
    r.status === 200 && roots.every((c) => c.parentId === null && Array.isArray(c.children)),
    "tree=true trả sai cấu trúc",
  );
  check(
    "C6-child",
    roots.some((c) => c.children.some((x) => x.id === child.id)),
    "danh mục con không nằm trong children",
  );

  r = await A.call("POST", "/categories", { name: `Sai type ${stamp}`, type: "INCOME", parentId: sysExpense.id });
  check("C10", r.status === 400 && r.body?.error?.details?.parentId, JSON.stringify(r.body));

  r = await A.call("POST", "/categories", { name: `Cấp 3 ${stamp}`, type: "EXPENSE", parentId: child.id });
  check("C11", r.status === 400, JSON.stringify(r.body));

  r = await A.call("POST", "/categories", { name: `Cha lạ ${stamp}`, type: "EXPENSE", parentId: "khong-ton-tai" });
  check("C12", r.status === 404 && r.body?.error?.code === "PARENT_CATEGORY_NOT_FOUND", JSON.stringify(r.body));

  r = await A.call("POST", "/categories", { name: `Cà phê ${stamp}`, type: "EXPENSE" });
  check("C13", r.status === 409 && r.body?.error?.code === "CATEGORY_NAME_DUPLICATED", JSON.stringify(r.body));

  // Trùng tên nhưng khác type là hợp lệ — unique key gồm cả `type`.
  r = await A.call("POST", "/categories", { name: `Cà phê ${stamp}`, type: "INCOME" });
  const coffeeIncome = r.body?.data;
  check("C14", r.status === 201, JSON.stringify(r.body));
  ctx.categories.coffeeIncome = coffeeIncome;

  r = await A.call("PATCH", `/categories/${sysExpense.id}`, { name: "Đổi tên hệ thống" });
  check("C15", r.status === 403 && r.body?.error?.code === "SYSTEM_CATEGORY_READONLY", JSON.stringify(r.body));

  r = await B.call("PATCH", `/categories/${coffee.id}`, { name: "Của người khác" });
  check("C16", r.status === 404 && r.body?.error?.code === "CATEGORY_NOT_FOUND", JSON.stringify(r.body));

  r = await A.call("PATCH", `/categories/${coffee.id}`, { parentId: coffee.id });
  check("C17", r.status === 400, JSON.stringify(r.body));

  r = await A.call("DELETE", `/categories/${sysExpense.id}`);
  check("C20", r.status === 403 && r.body?.error?.code === "SYSTEM_CATEGORY_READONLY", JSON.stringify(r.body));

  r = await A.call("POST", "/categories", { name: `Màu sai ${stamp}`, type: "EXPENSE", color: "red" });
  check("C24", r.status === 400 && r.body?.error?.details?.color, JSON.stringify(r.body));
}

/** Xoá danh mục — chỉ kiểm chứng đủ khi đã có giao dịch tham chiếu. */
export async function runAfterTransactions(ctx) {
  const { A, check, categories } = ctx;

  // Danh mục sạch (không giao dịch, không con) thì xoá được.
  let r = await A.call("DELETE", `/categories/${categories.coffeeIncome.id}`);
  check("C23", r.status === 204, `${r.status}`);

  r = await A.call("DELETE", `/categories/${categories.sysExpense.id}`);
  check("C21-system", r.status === 403, `${r.status}`);

  r = await A.call("DELETE", `/categories/${categories.child.id}`);
  check("C22", r.status === 204, `${r.status} ${JSON.stringify(r.body)}`);
}
