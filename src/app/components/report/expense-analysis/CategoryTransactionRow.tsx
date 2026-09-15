import { formatDayLabel } from "@/lib/period";
import { formatMoney } from "@/lib/format";
import type { CategoryTransactionItem } from "@/lib/expense-analysis-client";

interface CategoryTransactionRowProps {
  transaction: CategoryTransactionItem;
}

export default function CategoryTransactionRow({ transaction }: CategoryTransactionRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-slate-500">
        {formatDayLabel(new Date(transaction.date))}
      </span>
      <div className="flex flex-col items-end">
        <span className="text-sm font-medium tabular-nums text-rose-600">
          {formatMoney(transaction.amount, transaction.currency)}
        </span>
        <span className="text-xs text-slate-500">
          {transaction.accountIcon ? `${transaction.accountIcon} ` : ""}
          {transaction.accountName}
        </span>
      </div>
    </div>
  );
}
