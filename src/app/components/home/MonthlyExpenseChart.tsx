import { formatCurrency } from "@/lib/format";
import type { MonthlyPoint } from "@/lib/home-types";

interface MonthlyExpenseChartProps {
  points: MonthlyPoint[];
  currency: string;
}

/**
 * Bậc chia trục Y (đơn vị triệu). Chọn bậc nhỏ nhất mà 4 bậc phủ hết giá trị
 * lớn nhất, để trục luôn có đúng 5 mốc tròn số.
 */
const STEPS = [0.1, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 250, 500, 1000];

function axisStep(maxMillion: number): number {
  return STEPS.find((step) => step * 4 >= maxMillion) ?? maxMillion / 4;
}

/** 2.5 -> "2.5", 8 -> "8" (bỏ số 0 thừa sau dấu chấm). */
function tickLabel(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/** "2026-05" -> "05". */
function monthLabel(month: string): string {
  return month.split("-")[1] ?? month;
}

export default function MonthlyExpenseChart({
  points,
  currency,
}: MonthlyExpenseChartProps) {
  const maxAmount = Math.max(...points.map((point) => point.amount), 0);
  const step = axisStep(maxAmount / 1_000_000);
  const axisMax = step * 4;
  const ticks = [4, 3, 2, 1, 0].map((index) => step * index);

  const description = points
    .map(
      (point) =>
        `tháng ${monthLabel(point.month)}: ${formatCurrency(point.amount)} ${currency}`,
    )
    .join(", ");

  return (
    <div>
      <p className="text-xs text-slate-500">(Unit: Million)</p>

      <div className="mt-2 flex gap-2">
        <div className="-my-1.5 flex h-48 w-8 shrink-0 flex-col justify-between text-right text-xs leading-3 text-slate-500">
          {ticks.map((tick) => (
            <span key={tick}>{tickLabel(tick)}</span>
          ))}
        </div>

        <div
          role="img"
          aria-label={`Chi tiêu theo tháng — ${description}`}
          className="relative h-48 min-w-0 flex-1"
        >
          {/* Lưới ngang: 5 đường trùng với 5 mốc của trục Y. */}
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <div key={tick} className="border-t border-slate-200" />
            ))}
          </div>

          <div className="relative flex h-full items-end gap-1">
            {points.map((point) => (
              <div
                key={point.month}
                className="flex h-full min-w-0 flex-1 items-end"
              >
                {/* Chiều cao chỉ tính được lúc chạy nên bắt buộc dùng inline style. */}
                <div
                  className="w-full rounded-t bg-rose-600"
                  style={{
                    height:
                      axisMax > 0
                        ? `${(point.amount / (axisMax * 1_000_000)) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-1 flex gap-2">
        <div className="w-8 shrink-0" />
        <div className="flex min-w-0 flex-1 gap-1">
          {points.map((point) => (
            <span
              key={point.month}
              className="min-w-0 flex-1 text-center text-xs tabular-nums text-slate-500"
            >
              {monthLabel(point.month)}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-slate-500">
        {currency} — expenses only
      </p>
    </div>
  );
}
