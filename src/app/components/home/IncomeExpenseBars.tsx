import { formatCurrency } from "@/lib/format";
import type { FlowSummary } from "@/lib/home-types";

interface IncomeExpenseBarsProps {
  flow: FlowSummary;
}

/** 20000000 -> "20M", 500000 -> "0.5M". Dùng cho nhãn trục Y cho khỏi dài. */
function toMillionLabel(value: number): string {
  const millions = value / 1_000_000;
  if (millions === 0) return "0";
  return `${Number(millions.toFixed(millions < 10 ? 1 : 0))}M`;
}

/** Chiều cao cột theo % của mốc lớn nhất; mốc lớn nhất luôn > 0. */
function heightPercent(value: number, max: number): number {
  return max > 0 ? (value / max) * 100 : 0;
}

export default function IncomeExpenseBars({ flow }: IncomeExpenseBarsProps) {
  const max = Math.max(flow.income, flow.expense, 1);
  const ticks = [max, max / 2, 0];

  return (
    <div>
      <p className="text-xs text-slate-500">(Unit: {flow.currency})</p>

      <div className="mt-2 flex gap-3">
        {/* Nhãn trục Y — cùng chiều cao với vùng cột để các mốc thẳng hàng. */}
        <div className="flex h-40 w-10 shrink-0 flex-col justify-between text-right text-xs text-slate-500">
          {ticks.map((tick) => (
            <span key={tick}>{toMillionLabel(tick)}</span>
          ))}
        </div>

        <div
          role="img"
          aria-label={`Thu nhập ${formatCurrency(flow.income)} ${flow.currency}, chi tiêu ${formatCurrency(flow.expense)} ${flow.currency}`}
          className="flex h-40 flex-1 items-end gap-4 border-b border-l border-slate-200 px-2"
        >
          {/* Chiều cao chỉ tính được lúc chạy nên bắt buộc dùng inline style. */}
          <div
            className="w-full max-w-16 rounded-t bg-emerald-600"
            style={{ height: `${heightPercent(flow.income, max)}%` }}
          />
          <div
            className="w-full max-w-16 rounded-t bg-rose-600"
            style={{ height: `${heightPercent(flow.expense, max)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 pl-13 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-sm bg-emerald-600" />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-sm bg-rose-600" />
          Expense
        </span>
      </div>
    </div>
  );
}
