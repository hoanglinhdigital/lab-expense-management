/**
 * Lớp dữ liệu phía client cho màn Report.
 *
 * Chưa có API thật (`docs/api-spec/` chưa có spec cho report), nên đây là stub:
 * giả lập độ trễ mạng rồi trả về dữ liệu mẫu khớp mockup. Khi API sẵn sàng chỉ
 * cần thay thân hàm bằng `fetch` (gợi ý: GET /api/report/overview và
 * GET /api/report/flow-summary?tab=) — kiểu trả về giữ nguyên nên UI không sửa.
 */

import type { FlowDetail, PeriodTab, ReportOverview } from "./report-types";

const CURRENCY = "VND";

const OVERVIEW: ReportOverview = {
  statement: {
    netWorth: 3_200_000_000,
    assets: 1_900_000_000,
    liabilities: 1_300_000_000,
    currency: CURRENCY,
  },
  flow: { income: 20_000_000, expense: 12_000_000, currency: CURRENCY },
};

/** Số liệu tab "Current" — lấy đúng theo `docs/mockup/report/report-current.png`. */
const CURRENT_DETAIL: FlowDetail = {
  scopeLabel: "In 2026",
  currency: CURRENCY,
  periods: [
    { id: "today", label: "Today", income: 0, expense: 0 },
    { id: "week", label: "This week", income: 0, expense: 510_000 },
    { id: "month", label: "This month", income: 0, expense: 510_000 },
    { id: "quarter", label: "This quarter", income: 0, expense: 510_000 },
    { id: "year", label: "This year", income: 72_689_000, expense: 8_302_200 },
  ],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchReportOverview(): Promise<ReportOverview> {
  await delay(500);
  // TODO: thay bằng GET /api/report/overview khi API sẵn sàng.
  return OVERVIEW;
}

export async function fetchFlowDetail(tab: PeriodTab): Promise<FlowDetail> {
  await delay(400);
  // TODO: thay bằng GET /api/report/flow-summary?tab=... khi API sẵn sàng.
  // Chỉ tab Current có mockup; các tab còn lại trả rỗng để UI hiện thông báo
  // "đang phát triển" thay vì bịa số liệu.
  if (tab !== "CURRENT") {
    return { scopeLabel: CURRENT_DETAIL.scopeLabel, currency: CURRENCY, periods: [] };
  }
  return CURRENT_DETAIL;
}
