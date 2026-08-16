/**
 * Test case D1–D15 — `plans/backend/04_contact.md`, spec `docs/api-spec/contact.yaml`.
 *
 * Cung cấp: `ctx.contacts.minh` (dùng cho BORROW), `ctx.contacts.lan` (dùng cho LEND).
 */

export const name = "contact";
export const deps = ["auth"];

export async function run(ctx) {
  const { A, B, check, stamp } = ctx;

  let r = await A.call("POST", "/contacts", { name: `Anh Minh ${stamp}` });
  const minh = r.body?.data;
  check("D1", r.status === 201 && minh?.phone === null && minh?.email === null, JSON.stringify(r.body));

  r = await A.call("POST", "/contacts", { name: `Anh Minh ${stamp}` });
  check("D2", r.status === 409 && r.body?.error?.code === "CONTACT_NAME_DUPLICATED", JSON.stringify(r.body));

  r = await A.call("POST", "/contacts", { name: `Email sai ${stamp}`, email: "abc" });
  check("D3", r.status === 400 && r.body?.error?.details?.email, JSON.stringify(r.body));

  r = await A.call("POST", "/contacts", { name: `Phone sai ${stamp}`, phone: "abc" });
  check("D4", r.status === 400 && r.body?.error?.details?.phone, JSON.stringify(r.body));

  r = await A.call("POST", "/contacts", { name: `Chị Lan ${stamp}`, phone: "0901234567" });
  const lan = r.body?.data;

  ctx.contacts = { minh, lan };

  r = await B.call("GET", "/contacts");
  check("D5", r.status === 200 && r.body.meta.total === 0, `user B thấy ${r.body?.meta?.total} contact của A`);

  r = await A.call("GET", "/contacts?keyword=0901234567");
  check(
    "D6",
    r.status === 200 && r.body.meta.total === 1 && r.body.data[0].id === lan.id,
    JSON.stringify(r.body?.data),
  );

  r = await A.call("GET", "/contacts?sort=name_asc");
  const names = r.body.data.map((c) => c.name);
  check("D7", names.every((v, i) => i === 0 || names[i - 1].localeCompare(v) <= 0), JSON.stringify(names));

  r = await B.call("GET", `/contacts/${minh.id}`);
  check("D10", r.status === 404 && r.body?.error?.code === "CONTACT_NOT_FOUND", JSON.stringify(r.body));

  // Gửi `null` tường minh là xoá giá trị, khác với không gửi field.
  r = await A.call("PATCH", `/contacts/${lan.id}`, { phone: null });
  check("D11", r.status === 200 && r.body.data.phone === null, JSON.stringify(r.body?.data));

  r = await A.call("PATCH", `/contacts/${lan.id}`, {});
  check("D12", r.status === 400, `${r.status}`);
}

/** Tổng công nợ và ràng buộc xoá — cần giao dịch BORROW/LEND đã tồn tại. */
export async function runAfterTransactions(ctx) {
  const { A, check, contacts } = ctx;

  let r = await A.call("DELETE", `/contacts/${contacts.minh.id}`);
  check("D13", r.status === 409 && r.body?.error?.code === "CONTACT_HAS_TRANSACTIONS", JSON.stringify(r.body));

  r = await A.call("GET", "/contacts?includeTotals=true");
  const minh = r.body.data.find((c) => c.id === contacts.minh.id);
  const lan = r.body.data.find((c) => c.id === contacts.lan.id);
  check(
    "D8",
    Number(minh?.totalBorrow) === 300000 && Number(lan?.totalLend) === 100000,
    `minh=${JSON.stringify(minh)} lan=${JSON.stringify(lan)}`,
  );

  r = await A.call("GET", `/contacts/${contacts.minh.id}`);
  check(
    "D9",
    r.status === 200 && r.body.data.totalLend !== undefined && r.body.data.transactionCount === 1,
    JSON.stringify(r.body?.data),
  );
}
