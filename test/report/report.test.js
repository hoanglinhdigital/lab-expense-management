/**
 * Test case H1–H32 — `plans/backend/07_report.md`, spec `docs/api-spec/report.yaml`.
 *
 * Chạy lẻ:  k6 run test/report/report.test.js
 *
 * Module này tự dựng dữ liệu thu/chi của riêng nó. Lý do: khi chạy trọn bộ,
 * module transaction kết thúc bằng việc xoá giao dịch INCOME (E29) và đổi giao
 * dịch EXPENSE thành TRANSFER (E27), nên nếu không dựng lại thì mọi báo cáo sẽ
 * trả 0 và test pass một cách vô nghĩa. Nhờ vậy chạy lẻ hay chạy trọn bộ đều đối
 * chiếu trên cùng một bộ số.
 */

import { waitForServer } from "../lib/http.js";
import {
  createContext,
  bootstrapAuth,
  bootstrapAccounts,
  bootstrapCategories,
  bootstrapContacts,
  bootstrapTransactions,
} from "../lib/fixtures.js";
import { expect, moduleGroup } from "../lib/expect.js";
import { baseOptions } from "../lib/options.js";

export const options = baseOptions;
export const name = "report";

/**
 * Runtime của k6 không có `Intl`, nên thứ trong tuần theo giờ Việt Nam được tính
 * bằng offset cố định +07:00 — Việt Nam không áp dụng giờ mùa hè nên offset này
 * luôn đúng.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekdayInVN(isoString) {
  return WEEKDAYS[new Date(new Date(isoString).getTime() + VN_OFFSET_MS).getUTCDay()];
}

export function run(ctx) {
  const { A, B, anon, stamp, dateNow, accounts, categories } = ctx;
  const { cash, bank } = accounts;
  const { sysExpense, sysIncome } = categories;

  let r = A.call("POST", "/categories", {
    name: `Ăn vặt ${stamp}`,
    type: "EXPENSE",
    parentId: sysExpense.id,
  });
  const snack = r.body?.data;
  expect("H-setup-child", r.status === 201, JSON.stringify(r.body));

  A.call("POST", "/transactions", {
    type: "INCOME",
    amount: "10000000",
    date: dateNow,
    fromAccountId: bank.id,
    categoryId: sysIncome.id,
  });
  A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "400000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: sysExpense.id,
  });
  A.call("POST", "/transactions", {
    type: "EXPENSE",
    amount: "100000",
    date: dateNow,
    fromAccountId: cash.id,
    categoryId: snack.id,
  });

  // --- /report/total-balance ------------------------------------------------

  r = A.call("GET", "/report/total-balance");
  const totalBalance = r.body?.data;
  expect(
    "H1",
    r.status === 200 && totalBalance?.accountCount === 3 && Number(totalBalance.total) !== 0,
    JSON.stringify(totalBalance),
  );
  // byCurrency giữ số dư gốc theo từng tiền tệ, chưa quy đổi.
  expect(
    "H4",
    totalBalance?.byCurrency?.length === 2 && totalBalance.byCurrency.some((x) => x.currency === "USD"),
    JSON.stringify(totalBalance?.byCurrency),
  );

  r = B.call("GET", "/report/total-balance");
  expect(
    "H2",
    r.status === 200 && r.body.data.total === "0.00" && r.body.data.byCurrency.length === 0,
    JSON.stringify(r.body?.data),
  );

  r = A.call("GET", "/report/total-balance?asOf=2020-01-01T00:00:00Z");
  expect("H3", r.status === 200 && Number(r.body.data.total) > 0, JSON.stringify(r.body?.data));

  // --- /report/expense-vs-income --------------------------------------------

  const nowMonth = new Date().toISOString().slice(0, 7);

  r = A.call("GET", "/report/expense-vs-income");
  const evi = r.body?.data;
  expect(
    "H5",
    r.status === 200 &&
      evi?.range?.dateFrom?.startsWith(nowMonth.slice(0, 4)) &&
      evi.range.timezone === "Asia/Ho_Chi_Minh",
    JSON.stringify(evi?.range),
  );
  expect(
    "H7",
    Number(evi.income) + Number(evi.expense) > 0 &&
      Number(evi.net) === Number(evi.income) - Number(evi.expense),
    JSON.stringify(evi),
  );

  r = A.call("GET", `/report/expense-vs-income?accountId=${cash.id}`);
  expect("H9-ok", r.status === 200, JSON.stringify(r.body));

  r = B.call("GET", `/report/expense-vs-income?accountId=${cash.id}`);
  expect("H9", r.status === 404 && r.body?.error?.details?.accountId, JSON.stringify(r.body));

  // --- /report/expense-by-category ------------------------------------------

  r = A.call("GET", "/report/expense-by-category");
  const byCat = r.body;
  const rootItem = byCat.data.find((x) => x.categoryId === sysExpense.id);
  // 400k ở danh mục cha + 100k ở danh mục con phải gộp thành 500k trên cha.
  expect("H10", r.status === 200 && Number(rootItem?.amount) === 500000, JSON.stringify(byCat?.data));
  expect("H10-noChild", !byCat.data.some((x) => x.categoryId === snack.id), "danh mục con lọt vào kết quả");

  const pctSum = byCat.data.reduce((s, x) => s + x.percentage, 0);
  expect("H12", Math.abs(pctSum - 100) < 0.5, `tổng percentage = ${pctSum}`);

  const amounts = byCat.data.map((x) => Number(x.amount));
  expect("H12-sort", amounts.every((v, i) => i === 0 || amounts[i - 1] >= v), JSON.stringify(amounts));

  r = B.call("GET", "/report/expense-by-category");
  expect(
    "H13",
    r.status === 200 && r.body.data.length === 0 && r.body.meta.totalAmount === "0.00",
    JSON.stringify(r.body),
  );

  r = A.call("GET", "/report/expense-by-category?flow=INCOME");
  expect("H14", r.status === 200, JSON.stringify(r.body?.meta));

  // --- /report/expense-analysis ---------------------------------------------

  r = A.call("GET", "/report/expense-analysis");
  expect(
    "H16",
    r.status === 200 && r.body.data.length === 6 && r.body.data[5].month === nowMonth,
    JSON.stringify(r.body?.data?.map((x) => x.month)),
  );
  expect(
    "H16-value",
    Number(r.body.data[5].expense) === 500000 && Number(r.body.data[5].income) === 10000000,
    JSON.stringify(r.body?.data?.[5]),
  );
  // Tháng không phát sinh giao dịch vẫn phải có phần tử với giá trị "0.00".
  expect(
    "H17",
    r.body.data.slice(0, 5).every((x) => x.expense === "0.00" && x.income === "0.00"),
    JSON.stringify(r.body?.data?.map((x) => [x.month, x.expense])),
  );

  r = A.call("GET", "/report/expense-analysis?months=12");
  expect("H18", r.status === 200 && r.body.data.length === 12, `${r.body?.data?.length}`);

  r = A.call("GET", "/report/expense-analysis?months=0");
  expect("H19", r.status === 400, `${r.status}`);

  r = A.call("GET", `/report/expense-analysis?categoryId=${sysExpense.id}`);
  expect("H20", r.status === 200, JSON.stringify(r.body?.meta));

  // --- /report/money-lend-borrow --------------------------------------------

  r = A.call("GET", "/report/money-lend-borrow");
  const loans = r.body;
  expect("H21", r.status === 200 && loans.data.length <= 5 && loans.meta.pageSize === 5, JSON.stringify(loans?.meta));
  expect(
    "H23",
    Number(loans.meta.totalLend) === 100000 && Number(loans.meta.totalBorrow) === 300000,
    JSON.stringify(loans?.meta),
  );

  r = A.call("GET", "/report/money-lend-borrow?kind=LEND");
  expect(
    "H22",
    r.status === 200 && r.body.data.every((x) => x.kind === "LEND"),
    JSON.stringify(r.body?.data?.map((x) => x.kind)),
  );

  // --- /report/overview -----------------------------------------------------

  r = A.call("GET", "/report/overview");
  const overview = r.body?.data;
  expect(
    "H25",
    r.status === 200 &&
      overview?.periods?.length === 4 &&
      overview.periods.map((p) => p.id).join(",") === "today,this_week,this_month,this_year",
    JSON.stringify(overview?.periods?.map((p) => p.id)),
  );
  expect(
    "H28",
    Number(overview.statement.netWorth) ===
      Number(overview.statement.assets) - Number(overview.statement.liabilities),
    JSON.stringify(overview?.statement),
  );
  expect(
    "H27",
    Number(overview.statement.liabilities) >= 300000,
    `liabilities=${overview?.statement?.liabilities} phải gồm khoản BORROW 300k`,
  );

  // Tuần phải bắt đầu từ Thứ Hai, tính theo giờ địa phương chứ không phải UTC.
  const weekStart = overview.periods.find((p) => p.id === "this_week").dateFrom;
  const weekday = weekdayInVN(weekStart);
  expect("H29", weekday === "Mon", `this_week bắt đầu ${weekStart} = ${weekday}, phải là Mon`);

  r = A.call("GET", "/report/overview?timezone=Invalid/Zone");
  expect("H30", r.status === 400 && r.body?.error?.details?.timezone, JSON.stringify(r.body));

  // --- Bảo vệ: mọi API ngoài auth đều phải chặn khách chưa đăng nhập --------

  const guarded = [
    "/report/total-balance",
    "/report/expense-vs-income",
    "/report/expense-by-category",
    "/report/expense-analysis",
    "/report/money-lend-borrow",
    "/report/overview",
    "/accounts",
    "/categories",
    "/contacts",
    "/transactions",
  ];
  for (const path of guarded) {
    const res = anon.call("GET", path);
    expect(`H31 ${path}`, res.status === 401, `${path} trả ${res.status}`);
  }

  r = B.call("GET", "/report/overview");
  expect("H32", r.status === 200 && r.body.data.statement.assets === "0.00", JSON.stringify(r.body?.data?.statement));
}

export default function main() {
  if (!waitForServer()) throw new Error("không kết nối được tới API — chạy `npm run dev` trước");

  const ctx = createContext();
  bootstrapAuth(ctx);
  bootstrapAccounts(ctx);
  bootstrapCategories(ctx);
  bootstrapContacts(ctx);
  bootstrapTransactions(ctx);

  moduleGroup(name, () => run(ctx));
}
