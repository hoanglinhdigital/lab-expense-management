/**
 * Lớp dữ liệu phía client cho màn Report — gọi `GET /api/report/overview`
 * (`docs/api-spec/report.yaml`).
 *
 * Chỉ tab "Current" của màn Flow detail có mockup/API tương ứng (4 kỳ cố định
 * today/this_week/this_month/this_year trả sẵn trong `periods`); các tab
 * Month/Quarter/Year/Custom chưa có API nên vẫn trả rỗng để UI hiện "đang phát
 * triển" thay vì bịa số liệu — giữ đúng hành vi cũ.
 */

import { apiFetch, fromDecimal } from "./api/client";
import type { FlowDetail, PeriodTab, ReportOverview } from "./report-types";

const CURRENCY_FALLBACK = "VND";

interface PeriodFlowDto {
  id: string;
  label: string;
  income: string;
  expense: string;
}

interface ReportOverviewDto {
  statement: { netWorth: string; assets: string; liabilities: string };
  periods: PeriodFlowDto[];
  currency: string;
}

interface ReportOverviewResponse {
  data: ReportOverviewDto;
}

async function loadOverviewDto(): Promise<ReportOverviewDto> {
  const { data } = await apiFetch<ReportOverviewResponse>("/report/overview");
  return data;
}

export async function fetchReportOverview(): Promise<ReportOverview> {
  const data = await loadOverviewDto();
  const thisMonth =
    data.periods.find((item) => item.id === "this_month") ?? data.periods[0];

  return {
    statement: {
      netWorth: fromDecimal(data.statement.netWorth),
      assets: fromDecimal(data.statement.assets),
      liabilities: fromDecimal(data.statement.liabilities),
      currency: data.currency,
    },
    flow: {
      income: fromDecimal(thisMonth?.income),
      expense: fromDecimal(thisMonth?.expense),
      currency: data.currency,
    },
  };
}

export async function fetchFlowDetail(tab: PeriodTab): Promise<FlowDetail> {
  if (tab !== "CURRENT") {
    return { scopeLabel: `In ${new Date().getFullYear()}`, currency: CURRENCY_FALLBACK, periods: [] };
  }

  const data = await loadOverviewDto();
  return {
    scopeLabel: `In ${new Date().getFullYear()}`,
    currency: data.currency,
    periods: data.periods.map((item) => ({
      id: item.id,
      label: item.label,
      income: fromDecimal(item.income),
      expense: fromDecimal(item.expense),
    })),
  };
}
