"use client";

import { ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { currencySymbol } from "@/lib/account-types";
import type { PeriodFlow } from "@/lib/report-types";

interface FlowPeriodRowProps {
  period: PeriodFlow;
  currency: string;
  /** Chevron mở danh sách giao dịch của kỳ — mockup chưa có màn đích. */
  onDetail: (label: string) => void;
}

export default function FlowPeriodRow({
  period,
  currency,
  onDetail,
}: FlowPeriodRowProps) {
  const symbol = currencySymbol(currency);
  const net = period.income - period.expense;

  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <span className="flex min-h-11 items-center text-sm font-medium text-slate-800">
        {period.label}
      </span>

      {/* Mỗi dòng cao 44px để chevron đạt vùng bấm tối thiểu. */}
      <div className="flex flex-col items-end">
        <span className="flex min-h-11 items-center pr-7 text-sm font-medium tabular-nums text-emerald-600">
          {formatCurrency(period.income)} {symbol}
        </span>

        <button
          type="button"
          onClick={() => onDetail(period.label)}
          aria-label={`Xem giao dịch chi tiêu ${period.label}`}
          className="flex min-h-11 items-center gap-1 text-sm font-medium tabular-nums text-rose-600"
        >
          {formatCurrency(period.expense)} {symbol}
          <ChevronRight size={16} className="text-slate-500" aria-hidden />
        </button>

        <span
          className={`flex min-h-11 items-center pr-7 text-sm font-medium tabular-nums ${
            net < 0 ? "text-rose-600" : "text-slate-800"
          }`}
        >
          {formatCurrency(net)} {symbol}
        </span>
      </div>
    </div>
  );
}
