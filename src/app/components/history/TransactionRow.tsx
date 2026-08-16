"use client";

import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { amountColorClass } from "@/lib/history-types";
import type { TransactionListItem } from "@/lib/history-types";

interface TransactionRowProps {
  item: TransactionListItem;
}

export default function TransactionRow({ item }: TransactionRowProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/history/${item.id}`)}
      className="flex min-h-11 w-full items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 text-left hover:bg-slate-50"
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl"
      >
        {item.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-slate-800">{item.title}</span>
        {item.note ? (
          <span className="block truncate text-xs text-slate-500">{item.note}</span>
        ) : null}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`text-sm font-medium tabular-nums ${amountColorClass(item.type)}`}
        >
          {formatCurrency(item.amount)} {item.currency}
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <span aria-hidden className="size-2 rounded-full bg-slate-400" />
          {item.fromAccountName}
        </span>
      </span>
    </button>
  );
}
