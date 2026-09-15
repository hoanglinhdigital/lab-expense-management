import CategoryBreakdownRow from "./CategoryBreakdownRow";
import type { CategoryBreakdownEntry } from "@/lib/expense-analysis-client";

interface CategoryBreakdownListProps {
  items: CategoryBreakdownEntry[];
  currency: string;
  /** Query kỳ đang chọn, gắn vào link sang màn chi tiết để giữ lựa chọn kỳ. */
  periodQuery: Record<string, string>;
}

export default function CategoryBreakdownList({
  items,
  currency,
  periodQuery,
}: CategoryBreakdownListProps) {
  const search = new URLSearchParams(periodQuery).toString();

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {items.map((item) => (
        <CategoryBreakdownRow
          key={item.categoryId ?? "uncategorized"}
          item={item}
          currency={currency}
          href={item.categoryId ? `/report/expense-analysis/${item.categoryId}?${search}` : null}
        />
      ))}
    </div>
  );
}
