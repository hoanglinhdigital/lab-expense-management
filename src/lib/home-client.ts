/**
 * Lớp dữ liệu phía client cho màn hình Home.
 *
 * Chưa có API thật (`docs/api-spec/` chưa có spec cho dashboard), nên đây là
 * stub: giả lập độ trễ mạng rồi trả về dữ liệu mẫu khớp mockup. Khi API sẵn
 * sàng chỉ cần thay thân hàm bằng `fetch` (gợi ý: GET /api/home/overview?range=)
 * — kiểu trả về giữ nguyên nên UI không phải sửa.
 */

import type { HomeOverview, MonthlyPoint, PeriodRange } from "./home-types";
import { getPeriodOption } from "./home-types";

const CURRENCY = "VND";

/** 12 tháng gần nhất tính tới 08/2026 — cắt bớt theo `range` khi trả về. */
const MONTHLY: MonthlyPoint[] = [
  { month: "2025-09", amount: 3_240_000 },
  { month: "2025-10", amount: 2_780_000 },
  { month: "2025-11", amount: 5_100_000 },
  { month: "2025-12", amount: 6_450_000 },
  { month: "2026-01", amount: 0 },
  { month: "2026-02", amount: 0 },
  { month: "2026-03", amount: 0 },
  { month: "2026-04", amount: 1_100_000 },
  { month: "2026-05", amount: 4_750_000 },
  { month: "2026-06", amount: 1_800_000 },
  { month: "2026-07", amount: 0 },
  { month: "2026-08", amount: 400_000 },
];

const OVERVIEW: Omit<HomeOverview, "monthly"> = {
  user: { name: "Linh Nguyễn" },
  balance: { total: 3_200_120_050, currency: CURRENCY },
  flow: { income: 20_000_000, expense: 12_000_000, currency: CURRENCY },
  expenseByCategory: [
    { id: "cat-fixed", name: "Chi tiêu cố định", amount: 6_117_600 },
    { id: "cat-extra", name: "Chi tiêu phát sinh", amount: 5_882_400 },
  ],
  exchangeRates: [
    { code: "USD", symbol: "$", region: "US", rate: 25_450 },
    { code: "EUR", symbol: "€", region: "EU", rate: 27_200 },
    { code: "JPY", symbol: "¥", region: "JP", rate: 165 },
  ],
  loans: [
    {
      id: "loan-1",
      kind: "LEND",
      note: "Ku chó mượn khởi nghiệp",
      amount: 3_000_000,
      date: "2026-05-31",
    },
    {
      id: "loan-2",
      kind: "BORROW",
      note: "Mượn 10tr Nọng",
      amount: 10_000_000,
      date: "2026-06-07",
    },
    {
      id: "loan-3",
      kind: "BORROW",
      note: "Mượn nọng 1tr",
      amount: 1_000_000,
      date: "2026-05-31",
    },
  ],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchHomeOverview(
  range: PeriodRange,
): Promise<HomeOverview> {
  await delay(500);
  // TODO: thay bằng GET /api/home/overview?range=... khi API sẵn sàng.
  const { months } = getPeriodOption(range);
  return { ...OVERVIEW, monthly: MONTHLY.slice(-months) };
}
