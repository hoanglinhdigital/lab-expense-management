"use client";

import Link from "next/link";
import MonthlyExpenseChart from "./MonthlyExpenseChart";
import PeriodMenu from "./PeriodMenu";
import type { MonthlyPoint, PeriodRange } from "@/lib/home-types";

interface ExpenseAnalysisCardProps {
  points: MonthlyPoint[];
  currency: string;
  range: PeriodRange;
  /** Đang tải lại riêng khối này sau khi đổi khoảng thời gian. */
  loading: boolean;
  onRangeChange: (range: PeriodRange) => void;
}

/** "2026-01" -> "01/2026". */
function monthYear(month: string): string {
  const [year, monthPart] = month.split("-");
  return monthPart ? `${monthPart}/${year}` : month;
}

function rangeLabel(points: MonthlyPoint[]): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return "—";
  return `${monthYear(first.month)} – ${monthYear(last.month)}`;
}

export default function ExpenseAnalysisCard({
  points,
  currency,
  range,
  loading,
  onRangeChange,
}: ExpenseAnalysisCardProps) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 text-base font-medium text-slate-800">
          Expense analysis
        </h2>
        <PeriodMenu
          value={range}
          label={rangeLabel(points)}
          onChange={onRangeChange}
        />
      </div>

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        {loading ? (
          <div aria-busy>
            <span className="sr-only">Đang tải biểu đồ chi tiêu</span>
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-48 animate-pulse rounded-lg bg-slate-200" />
          </div>
        ) : points.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-800">
              Chưa có chi tiêu nào trong kỳ này
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Thử chọn khoảng thời gian dài hơn, hoặc ghi khoản chi mới.
            </p>
            <Link
              href="/record"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Ghi giao dịch
            </Link>
          </div>
        ) : (
          <MonthlyExpenseChart points={points} currency={currency} />
        )}
      </div>
    </section>
  );
}
