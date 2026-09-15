import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { CategoryBreakdownEntry } from "@/lib/expense-analysis-client";

interface CategoryBreakdownRowProps {
  item: CategoryBreakdownEntry;
  currency: string;
  /** `null` khi không có danh mục để mở chi tiết (mục "Chưa phân loại"). */
  href: string | null;
}

const FALLBACK_COLOR = "#94a3b8";
const FALLBACK_ICON = "📁";

function RowBody({ item, currency }: { item: CategoryBreakdownEntry; currency: string }) {
  const color = item.color ?? FALLBACK_COLOR;

  return (
    <>
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg"
      >
        {item.icon ?? FALLBACK_ICON}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{item.name}</span>
          <span className="shrink-0 text-xs text-slate-500">
            ({item.percentage.toFixed(2)}%)
          </span>
          <span className="shrink-0 text-sm font-medium tabular-nums text-rose-600">
            {formatMoney(item.amount, currency)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(item.percentage, 100)}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </>
  );
}

export default function CategoryBreakdownRow({ item, currency, href }: CategoryBreakdownRowProps) {
  if (!href) {
    return (
      <div className="flex min-h-11 items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
        <RowBody item={item} currency={currency} />
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
    >
      <RowBody item={item} currency={currency} />
      <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden />
    </Link>
  );
}
