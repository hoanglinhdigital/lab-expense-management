import { donutColor, type CategorySlice } from "@/lib/home-types";

interface CategoryDonutProps {
  slices: CategorySlice[];
}

const RADIUS = 35;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CategoryDonut({ slices }: CategoryDonutProps) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  if (total <= 0) return null;

  // Cộng dồn tỷ lệ của các lát đứng trước để biết lát này bắt đầu ở đâu.
  const arcs = slices.map((slice, index) => {
    const before = slices
      .slice(0, index)
      .reduce((sum, item) => sum + item.amount, 0);
    const ratio = slice.amount / total;
    return {
      id: slice.id,
      color: donutColor(index),
      length: ratio * CIRCUMFERENCE,
      start: (before / total) * CIRCUMFERENCE,
      percent: ratio * 100,
    };
  });

  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label="Tỷ trọng chi tiêu theo nhóm danh mục"
        className="size-28 shrink-0 -rotate-90"
      >
        {arcs.map((arc) => (
          <circle
            key={arc.id}
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="18"
            stroke="currentColor"
            className={arc.color}
            // Độ dài cung chỉ tính được lúc chạy nên bắt buộc dùng thuộc tính động.
            strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
            strokeDashoffset={-arc.start}
          />
        ))}
      </svg>

      <ul className="min-w-0 flex-1 space-y-2">
        {arcs.map((arc, index) => (
          <li key={arc.id} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className={`size-3 shrink-0 rounded-full bg-current ${arc.color}`}
            />
            {/* Tên nhóm xuống dòng thay vì cắt bớt — ở 375px tên tiếng Việt dễ dài hơn cột. */}
            <span className="min-w-0 flex-1 text-slate-800">
              {slices[index].name}
            </span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {arc.percent.toFixed(2)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
