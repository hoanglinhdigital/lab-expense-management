"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import CategoryTransactionRow from "./CategoryTransactionRow";
import { formatMoney } from "@/lib/format";
import type { CategoryBreakdownEntry, CategoryTransactionItem } from "@/lib/expense-analysis-client";

interface CategoryChildRowProps {
  item: CategoryBreakdownEntry;
  currency: string;
  open: boolean;
  loading: boolean;
  error?: string;
  transactions?: CategoryTransactionItem[];
  onToggle: () => void;
}

const FALLBACK_ICON = "📁";

export default function CategoryChildRow({
  item,
  currency,
  open,
  loading,
  error,
  transactions,
  onToggle,
}: CategoryChildRowProps) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        {open ? (
          <ChevronUp size={16} className="shrink-0 text-slate-500" aria-hidden />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-slate-500" aria-hidden />
        )}
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-base"
        >
          {item.icon ?? FALLBACK_ICON}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{item.name}</span>
        <span className="shrink-0 text-sm font-medium tabular-nums text-rose-600">
          {formatMoney(item.amount, currency)}
        </span>
      </button>

      {open ? (
        <div className="bg-slate-50 px-4 pb-3">
          {loading ? (
            <div className="space-y-2 py-2">
              <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
            </div>
          ) : error ? (
            <p className="py-2 text-sm text-rose-600">{error}</p>
          ) : transactions && transactions.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <CategoryTransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          ) : (
            <p className="py-2 text-sm text-slate-500">Không có giao dịch</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
