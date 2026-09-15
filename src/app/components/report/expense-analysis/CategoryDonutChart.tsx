import type { CategoryBreakdownEntry } from "@/lib/expense-analysis-client";

interface CategoryDonutChartProps {
  items: CategoryBreakdownEntry[];
  currency: string;
}

const RADIUS = 70;
const STROKE = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Màu dữ liệu khi category không đặt `color` — tương đương `slate-400`, không phải màu mới. */
const FALLBACK_COLOR = "#94a3b8";

/**
 * Donut chart vẽ bằng SVG thuần (dự án chưa có thư viện chart, `IncomeExpenseBars`
 * cũng tự vẽ bằng CSS) — mỗi lát cắt là một `<circle>` xoay dần theo % cộng dồn.
 * Màu lát cắt lấy từ `category.color` (dữ liệu), không phải màu vai trò giao diện.
 */
/** Lát cắt kèm độ dài dash + offset cộng dồn — tính trước vòng render, không mutate biến trong JSX. */
function buildSlices(items: CategoryBreakdownEntry[]) {
  let cumulative = 0;
  return items.map((item) => {
    const dash = (item.percentage / 100) * CIRCUMFERENCE;
    const slice = { item, dash, offset: -cumulative };
    cumulative += dash;
    return slice;
  });
}

export default function CategoryDonutChart({ items, currency }: CategoryDonutChartProps) {
  const slices = buildSlices(items);

  return (
    <div>
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={`Biểu đồ tỷ trọng chi tiêu theo danh mục, đơn vị ${currency}`}
        className="mx-auto w-full max-w-64"
      >
        <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth={STROKE} />
        <g transform="rotate(-90 100 100)">
          {slices.map(({ item, dash, offset }) => (
            <circle
              key={item.categoryId ?? "uncategorized"}
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              stroke={item.color ?? FALLBACK_COLOR}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={offset}
            />
          ))}
        </g>
      </svg>

      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {items.map((item) => (
          <span
            key={item.categoryId ?? "uncategorized"}
            className="flex items-center gap-1.5 text-xs text-slate-500"
          >
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color ?? FALLBACK_COLOR }}
            />
            {item.name} ({item.percentage.toFixed(1)}%)
          </span>
        ))}
      </div>
    </div>
  );
}
