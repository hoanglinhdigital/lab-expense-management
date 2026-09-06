/**
 * Test script — Chức năng "Tạo khoản chi tiêu" (Create Expense)
 *
 * Nguồn:
 *   - Test case : plans/test/create_expense_test_cases.md  (TC01–TC27)
 *   - API spec  : docs/api-spec/transaction.yaml  (POST /transactions)
 *   - Endpoint  : POST /api/transactions   (type = "EXPENSE")
 *
 * Góc nhìn Tester (black-box): chỉ gọi API qua HTTP, không đọc code route handler.
 *
 * Chạy:
 *   npm run test:api_transaction_expense
 *   (biến môi trường đọc từ `.env` qua test/run-with-env.mjs — xem `.env.example`)
 *
 *   Hoặc trực tiếp:
 *     k6 run -e API_BASE_URL=https://.../api \
 *            -e TEST_A_EMAIL=... -e TEST_A_PASSWORD=... \
 *            -e TEST_B_EMAIL=... -e TEST_B_PASSWORD=... \
 *            test/transaction/expense/testscript.js
 *
 * Hai bộ credential:
 *   - User A: chủ thể test — tạo/đọc khoản chi tiêu.
 *   - User B: người dùng khác — chỉ dùng để lấy `accountId` / `categoryId` KHÔNG
 *     thuộc A (TC18, TC23, TC26). Bắt buộc phải là tài khoản khác A.
 *   Nếu một email chưa tồn tại trên server, script tự đăng ký rồi đăng nhập lại.
 *
 * Output:
 *   - Mỗi test case in ra một khối 3 dòng: [TCxx] PASS/FAIL, expected, actual.
 *   - Cuối cùng in bảng tổng kết: tổng số PASS / FAIL và chi tiết các case FAIL.
 *   - Threshold `checks: rate==1.00` giữ nguyên → chỉ cần 1 case FAIL là
 *     `k6 run` trả exit code khác 0 để CI bắt được.
 */

import { check as k6check, group, sleep } from "k6";
import { makeClient, waitForServer, BASE_URL } from "../../lib/http.js";
import { baseOptions } from "../../lib/options.js";

export const options = baseOptions;
export const name = "transaction/expense — create";

const STAMP = Date.now();

// Hai bộ credential lấy từ .env. Có fallback để chạy nhanh trên server sạch:
// mỗi user một email ngẫu nhiên, script tự đăng ký.
const USER_A = {
  email: __ENV.TEST_A_EMAIL || __ENV.TEST_EMAIL || `expense-tc-a-${STAMP}@example.com`,
  password: __ENV.TEST_A_PASSWORD || __ENV.TEST_PASSWORD || "matkhau123",
};
const USER_B = {
  email: __ENV.TEST_B_EMAIL || `expense-tc-b-${STAMP}@example.com`,
  password: __ENV.TEST_B_PASSWORD || "matkhau123",
};

if (USER_A.email === USER_B.email) {
  throw new Error("TEST_A_EMAIL và TEST_B_EMAIL phải là hai tài khoản khác nhau");
}

// id có định dạng hợp lệ nhưng chắc chắn không tồn tại trong DB.
const MISSING_ID = "clnonexist0000000000000000";
const FUTURE_DATE = "2030-01-01T00:00:00Z";
const HUGE_AMOUNT = "999999999999999999999999999999.99";

// ============================ Reporting =================================

/** Kết quả từng test case, dùng để in bảng tổng kết cuối. */
const RESULTS = [];

/**
 * Ghi nhận + in kết quả một test case ngay lập tức.
 * @param {string} id        Mã test case, vd "TC01"
 * @param {string} title     Mô tả ngắn
 * @param {string} expected  Kỳ vọng (đọc được cho người)
 * @param {string} actual    Thực tế quan sát được
 * @param {boolean} pass      expected có khớp actual không
 */
function record(id, title, expected, actual, pass) {
  RESULTS.push({ id, title, expected, actual, pass: Boolean(pass) });

  // Đưa vào metric `checks` để threshold rate==1.00 hoạt động.
  k6check(null, { [`${id} — ${title}`]: () => Boolean(pass) });

  // In từng dòng riêng để k6 không nhét cả khối vào một `msg="..."` khó đọc.
  console.log(`[${id}] ${pass ? "PASS ✅" : "FAIL ❌"}  ${title}`);
  console.log(`      • expected : ${expected}`);
  console.log(`      • actual   : ${actual}`);
}

/** Tóm tắt phần thân response cho cột "actual". */
function seen(r, extra) {
  const parts = [`HTTP ${r.status}`];
  const code = r.body?.error?.code;
  if (code) parts.push(`error.code=${code}`);
  const details = r.body?.error?.details;
  if (details && Object.keys(details).length) parts.push(`details=${JSON.stringify(details)}`);
  if (extra) parts.push(extra);
  return parts.join("  |  ");
}

/** Định dạng số tiền có dấu phẩy ngăn cách nghìn (goja không có Intl). */
function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "null";
  const num = Number(n);
  const sign = num < 0 ? "-" : "";
  const [int, frac] = Math.abs(num).toString().split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return sign + grouped + (frac ? `.${frac}` : "");
}

function printSummary() {
  const pass = RESULTS.filter((x) => x.pass);
  const fail = RESULTS.filter((x) => !x.pass);
  const line = "=".repeat(74);

  console.log(line);
  console.log(`  TỔNG KẾT — ${pass.length}/${RESULTS.length} PASS, ${fail.length} FAIL`);
  console.log(line);

  for (const x of RESULTS) {
    console.log(`  ${x.pass ? "✅" : "❌"}  ${x.id}  ${x.title}`);
  }

  if (fail.length) {
    console.log(line);
    console.log(`  CHI TIẾT ${fail.length} CASE FAIL:`);
    for (const x of fail) {
      console.log(`  ❌ ${x.id}  ${x.title}`);
      console.log(`       expected : ${x.expected}`);
      console.log(`       actual   : ${x.actual}`);
    }
  }
  console.log(line);
}

// ============================ Helpers ===================================

/** currentBalance của một account, dạng số (null nếu không đọc được). */
function balanceOf(client, accountId) {
  const r = client.call("GET", `/accounts/${accountId}/balance`);
  if (r.status !== 200 || !r.body?.data) return null;
  return Number(r.body.data.currentBalance);
}

/** So khớp tiền tệ với sai số nhỏ — tránh lệ thuộc sai số chuỗi/float. */
const moneyEq = (a, b) => a != null && b != null && Math.abs(a - b) < 0.005;

/**
 * Đọc lại số dư account tới khi khớp `expected` hoặc hết số lần thử (TiDB Cloud
 * có độ trễ read-after-write ngắn). Trả về giá trị đọc được lần cuối.
 */
function waitBalance(client, accountId, expected) {
  let last = null;
  for (let i = 0; i < 8; i += 1) {
    last = balanceOf(client, accountId);
    if (moneyEq(last, expected)) break;
    sleep(0.8);
  }
  return last;
}

/** Đăng nhập; nếu chưa có tài khoản thì đăng ký rồi đăng nhập lại. */
function loginOrRegister(client, email, password) {
  let r = client.call("POST", "/auth/login", { email, password });
  if (r.status === 200) return r;

  client.call("POST", "/auth/register", {
    email,
    password,
    name: "Expense Tester",
    defaultCurrency: "VND",
  });
  return client.call("POST", "/auth/login", { email, password });
}

/** Lấy sẵn category (parent + child EXPENSE, 1 INCOME) và account cho user A / B. */
function bootstrap() {
  const A = makeClient("A");
  const B = makeClient("B");
  const anon = makeClient("anon");

  const loginA = loginOrRegister(A, USER_A.email, USER_A.password);
  if (loginA.status !== 200) {
    throw new Error(`Không đăng nhập được user A (${USER_A.email}): ${loginA.status} ${JSON.stringify(loginA.body)}`);
  }
  const loginB = loginOrRegister(B, USER_B.email, USER_B.password);
  if (loginB.status !== 200) {
    throw new Error(`Không đăng nhập được user B (${USER_B.email}): ${loginB.status} ${JSON.stringify(loginB.body)}`);
  }
  if (loginA.body?.data?.id && loginA.body.data.id === loginB.body?.data?.id) {
    throw new Error("User A và User B đang trỏ về cùng một tài khoản — cần hai user khác nhau");
  }

  // --- Categories --------------------------------------------------------
  const cats = A.call("GET", "/categories?pageSize=200").body?.data ?? [];
  const expenseCats = cats.filter((c) => c.type === "EXPENSE");

  let parentCat = expenseCats.find((c) => c.parentId == null);
  if (!parentCat) {
    parentCat = A.call("POST", "/categories", { name: `TC Parent ${STAMP}`, type: "EXPENSE" }).body.data;
  }

  let childCat = expenseCats.find((c) => c.parentId === parentCat.id);
  if (!childCat) {
    childCat = A.call("POST", "/categories", {
      name: `TC Child ${STAMP}`,
      type: "EXPENSE",
      parentId: parentCat.id,
    }).body.data;
  }

  let incomeCat = cats.find((c) => c.type === "INCOME");
  if (!incomeCat) {
    incomeCat = A.call("POST", "/categories", { name: `TC Income ${STAMP}`, type: "INCOME" }).body.data;
  }

  // Category EXPENSE thuộc user B — dùng cho case "category của user khác".
  const catOfB = B.call("POST", "/categories", { name: `TC B Expense ${STAMP}`, type: "EXPENSE" }).body?.data;

  // --- Accounts ---------------------------------------------------------
  let accountsA = (A.call("GET", "/accounts?pageSize=100").body?.data ?? []).filter(
    (a) => a.currency === "VND",
  );
  while (accountsA.length < 2) {
    const created = A.call("POST", "/accounts", {
      name: `TC Account ${accountsA.length + 1} ${STAMP}`,
      type: "CASH",
      currency: "VND",
      initialBalance: "100000000",
    }).body.data;
    accountsA.push(created);
  }
  const [accA1, accA2] = accountsA;

  const accB1 = B.call("POST", "/accounts", {
    name: `TC Account B ${STAMP}`,
    type: "CASH",
    currency: "VND",
    initialBalance: "1000000",
  }).body.data;

  console.log(`Bối cảnh: A=${USER_A.email} accA1=${accA1.id} accA2=${accA2.id}`);
  console.log(`          B=${USER_B.email} accB1=${accB1.id}`);
  console.log(`          parentCat=${parentCat.id} childCat=${childCat.id} incomeCat=${incomeCat.id} catOfB=${catOfB?.id}`);
  console.log("-".repeat(74));

  return { A, B, anon, parentCat, childCat, incomeCat, catOfB, accA1, accA2, accB1 };
}

/** Body EXPENSE hợp lệ, cho phép ghi đè/xoá field để dựng case lỗi. */
function expenseBody(fx, overrides = {}) {
  const base = {
    type: "EXPENSE",
    amount: "10000",
    date: "2026-09-06T10:00:00Z",
    fromAccountId: fx.accA1.id,
    categoryId: fx.childCat.id,
  };
  const body = { ...base, ...overrides };
  for (const k of Object.keys(overrides)) {
    if (overrides[k] === undefined) delete body[k];
  }
  return body;
}

// ============================ Test cases ================================

export function run(fx) {
  const { A, B, anon } = fx;
  let r;

  // -------------------- HAPPY PATH -------------------------------------

  // TC01 — hợp lệ đầy đủ field, category child
  let b0 = balanceOf(A, fx.accA1.id);
  r = A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "150000.00",
    date: "2026-09-06T10:00:00Z",
    fromAccountId: fx.accA1.id,
    categoryId: fx.childCat.id,
    note: "Ăn trưa",
  });
  let after = waitBalance(A, fx.accA1.id, b0 - 150000);
  record(
    "TC01",
    "[Happy] Tạo chi tiêu đầy đủ field, category child",
    `HTTP 201; amount=150000; note="Ăn trưa"; số dư ${fmtMoney(b0)} → ${fmtMoney(b0 - 150000)}`,
    seen(r, `note=${JSON.stringify(r.body?.data?.note)}; số dư → ${fmtMoney(after)}`),
    r.status === 201 &&
      Number(r.body?.data?.amount) === 150000 &&
      r.body?.data?.note === "Ăn trưa" &&
      moneyEq(after, b0 - 150000),
  );

  // TC02 — không gửi note, category parent
  let b2 = balanceOf(A, fx.accA2.id);
  r = A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "20000",
    date: "2026-09-05T08:00:00Z",
    fromAccountId: fx.accA2.id,
    categoryId: fx.parentCat.id,
  });
  after = waitBalance(A, fx.accA2.id, b2 - 20000);
  record(
    "TC02",
    "[Happy] Không gửi note, chọn category parent",
    `HTTP 201; note=null; số dư ${fmtMoney(b2)} → ${fmtMoney(b2 - 20000)}`,
    seen(r, `note=${JSON.stringify(r.body?.data?.note)}; số dư → ${fmtMoney(after)}`),
    r.status === 201 && (r.body?.data?.note ?? null) === null && moneyEq(after, b2 - 20000),
  );

  // TC03 — note: null tường minh
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: "5000", note: null }));
  record(
    "TC03",
    "[Happy] Gửi note = null tường minh",
    "HTTP 201; note = null",
    seen(r, `note=${JSON.stringify(r.body?.data?.note)}`),
    r.status === 201 && (r.body?.data?.note ?? null) === null,
  );

  // -------------------- EDGE CASE ------------------------------------

  // TC04 — spentAt tương lai xa
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: "12345.67", date: FUTURE_DATE, categoryId: fx.parentCat.id }));
  record(
    "TC04",
    "[Edge] spentAt ở tương lai xa (2030) — không bị chặn",
    "HTTP 201; data.date = 2030-01-01…",
    seen(r, `data.date=${r.body?.data?.date}`),
    r.status === 201 && String(r.body?.data?.date ?? "").startsWith("2030-01-01"),
  );

  // TC05 — amount = 0.01 (biên dưới hợp lệ)
  let b5 = balanceOf(A, fx.accA1.id);
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: "0.01" }));
  after = waitBalance(A, fx.accA1.id, b5 - 0.01);
  record(
    "TC05",
    "[Edge] amount = 0.01 (nhỏ nhất > 0)",
    `HTTP 201; số dư ${fmtMoney(b5)} → ${fmtMoney(b5 - 0.01)}`,
    seen(r, `số dư → ${fmtMoney(after)}`),
    r.status === 201 && moneyEq(after, b5 - 0.01),
  );

  // TC06 — spentAt = now
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: "12345.67", date: new Date().toISOString(), categoryId: fx.parentCat.id }));
  record("TC06", "[Edge] spentAt = thời điểm hiện tại", "HTTP 201", seen(r), r.status === 201);

  // TC07 — note dài đúng 500 ký tự
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: "5000", note: "x".repeat(500) }));
  record(
    "TC07",
    "[Edge] note dài đúng 500 ký tự",
    "HTTP 201; note.length = 500",
    seen(r, `note.length=${r.body?.data?.note?.length}`),
    r.status === 201 && r.body?.data?.note?.length === 500,
  );

  // TC08 — note vượt 500 ký tự
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: "5000", note: "y".repeat(501) }));
  record(
    "TC08",
    "[Edge] note 501 ký tự — vượt giới hạn",
    "HTTP 400 (note quá dài)",
    seen(r),
    r.status === 400,
  );

  // TC09 — amount > 2 chữ số thập phân
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: "100.005" }));
  record(
    "TC09",
    "[Edge] amount có 3 chữ số thập phân (100.005)",
    "HTTP 400; error.details.amount",
    seen(r),
    r.status === 400 && r.body?.error?.details?.amount !== undefined,
  );

  // TC27 — amount cực lớn, tràn DECIMAL
  let b27 = balanceOf(A, fx.accA1.id);
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: HUGE_AMOUNT }));
  after = balanceOf(A, fx.accA1.id);
  record(
    "TC27",
    "[Edge] amount cực lớn, tràn DECIMAL của DB",
    "HTTP 400 (KHÔNG phải 500); số dư không đổi",
    seen(r, `số dư ${fmtMoney(b27)} → ${fmtMoney(after)}`),
    r.status === 400 && moneyEq(after, b27),
  );

  // -------------------- NEGATIVE CASE -------------------------------

  // TC10 — amount = 0
  let b10 = balanceOf(A, fx.accA1.id);
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: "0" }));
  after = balanceOf(A, fx.accA1.id);
  record(
    "TC10",
    "[Negative] amount = 0",
    "HTTP 400; error.details.amount; số dư không đổi",
    seen(r, `số dư ${fmtMoney(b10)} → ${fmtMoney(after)}`),
    r.status === 400 && r.body?.error?.details?.amount !== undefined && moneyEq(after, b10),
  );

  // TC11 — amount âm
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: "-50000" }));
  record("TC11", "[Negative] amount âm (-50000)", "HTTP 400", seen(r), r.status === 400);

  // TC12 — amount là chuỗi chữ
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: "abc" }));
  record("TC12", '[Negative] amount = "abc" (sai định dạng)', "HTTP 400", seen(r), r.status === 400);

  // TC13 — amount là JSON number
  r = A.call("POST", "/transactions", expenseBody(fx, { amount: 150000 }));
  record(
    "TC13",
    "[Negative] amount là number thay vì chuỗi decimal",
    "HTTP 400 (validate kiểu dữ liệu)",
    seen(r),
    r.status === 400,
  );

  // TC14 — categoryId không tồn tại
  r = A.call("POST", "/transactions", expenseBody(fx, { categoryId: MISSING_ID }));
  record(
    "TC14",
    "[Negative] categoryId không tồn tại",
    "HTTP 400 (category không tồn tại)",
    seen(r),
    r.status === 400,
  );

  // TC15 — thiếu categoryId
  r = A.call("POST", "/transactions", expenseBody(fx, { categoryId: undefined }));
  record("TC15", "[Negative] thiếu categoryId (bắt buộc với EXPENSE)", "HTTP 400", seen(r), r.status === 400);

  // TC16 — categoryId là INCOME
  r = A.call("POST", "/transactions", expenseBody(fx, { categoryId: fx.incomeCat.id }));
  record(
    "TC16",
    "[Negative] categoryId là category loại INCOME",
    "HTTP 400; error.details.categoryId",
    seen(r),
    r.status === 400 && r.body?.error?.details?.categoryId !== undefined,
  );

  // TC17 — accountId không tồn tại
  r = A.call("POST", "/transactions", expenseBody(fx, { fromAccountId: MISSING_ID }));
  record(
    "TC17",
    "[Negative] accountId (fromAccountId) không tồn tại",
    "HTTP 400 (account không tồn tại)",
    seen(r),
    r.status === 400,
  );

  // TC18 — accountId thuộc user khác
  let bB1 = balanceOf(B, fx.accB1.id);
  r = A.call("POST", "/transactions", expenseBody(fx, { fromAccountId: fx.accB1.id }));
  after = balanceOf(B, fx.accB1.id);
  record(
    "TC18",
    "[Negative] fromAccountId là account của user B",
    "HTTP 400; số dư account B không đổi",
    seen(r, `số dư B ${fmtMoney(bB1)} → ${fmtMoney(after)}`),
    r.status === 400 && moneyEq(after, bB1),
  );

  // TC19 — thiếu fromAccountId
  r = A.call("POST", "/transactions", expenseBody(fx, { fromAccountId: undefined }));
  record("TC19", "[Negative] thiếu fromAccountId", "HTTP 400", seen(r), r.status === 400);

  // TC20 — thiếu date
  r = A.call("POST", "/transactions", expenseBody(fx, { date: undefined }));
  record("TC20", "[Negative] thiếu spentAt (date)", "HTTP 400", seen(r), r.status === 400);

  // TC21 — date sai định dạng
  r = A.call("POST", "/transactions", expenseBody(fx, { date: "06-09-2026" }));
  record(
    "TC21",
    '[Negative] date = "06-09-2026" (sai định dạng ISO)',
    "HTTP 400 (lỗi định dạng date-time)",
    seen(r, `data.date=${r.body?.data?.date}`),
    r.status === 400,
  );

  // TC22 — chưa đăng nhập
  r = anon.call("POST", "/transactions", expenseBody(fx));
  record("TC22", "[Negative] chưa đăng nhập (không cookie session)", "HTTP 401", seen(r), r.status === 401);

  // TC23 — vi phạm nhiều ràng buộc cùng lúc
  let bA1 = balanceOf(A, fx.accA1.id);
  bB1 = balanceOf(B, fx.accB1.id);
  r = A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "0",
    date: "2026-09-06T10:00:00Z",
    fromAccountId: fx.accB1.id,
    categoryId: MISSING_ID,
  });
  const aA1 = balanceOf(A, fx.accA1.id);
  const aB1 = balanceOf(B, fx.accB1.id);
  record(
    "TC23",
    "[Negative] amount=0 + categoryId sai + account của user khác",
    "HTTP 400; không đổi số dư account nào",
    seen(r, `A ${fmtMoney(bA1)}→${fmtMoney(aA1)}; B ${fmtMoney(bB1)}→${fmtMoney(aB1)}`),
    r.status === 400 && moneyEq(aA1, bA1) && moneyEq(aB1, bB1),
  );

  // TC24 — body rỗng
  r = A.call("POST", "/transactions", {});
  record("TC24", "[Negative] body rỗng {}", "HTTP 400 (liệt kê field bắt buộc thiếu)", seen(r), r.status === 400);

  // TC25 — note sai kiểu
  r = A.call("POST", "/transactions", expenseBody(fx, { note: 12345 }));
  record("TC25", "[Negative] note là number thay vì chuỗi", "HTTP 400", seen(r), r.status === 400);

  // TC26 — categoryId của user khác
  if (fx.catOfB?.id) {
    r = A.call("POST", "/transactions", expenseBody(fx, { categoryId: fx.catOfB.id }));
    record(
      "TC26",
      "[Negative] categoryId là category của user B",
      "HTTP 400 (với A coi như category không tồn tại)",
      seen(r),
      r.status === 400,
    );
  } else {
    record("TC26", "[Negative] categoryId là category của user B", "HTTP 400", "không tạo được category cho user B", false);
  }
}

export default function main() {
  if (!waitForServer()) {
    throw new Error(`Không kết nối được tới API tại ${BASE_URL} — kiểm tra API_BASE_URL`);
  }
  console.log(`API_BASE_URL = ${BASE_URL}`);
  console.log("=".repeat(74));

  const fx = bootstrap();
  group(name, () => run(fx));
  printSummary();
}
