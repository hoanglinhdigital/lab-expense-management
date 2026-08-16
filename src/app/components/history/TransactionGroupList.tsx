"use client";

import { formatCurrency } from "@/lib/format";
import type { TransactionGroup } from "@/lib/history-types";
import TransactionRow from "./TransactionRow";

interface TransactionGroupListProps {
  groups: TransactionGroup[];
}

export default function TransactionGroupList({ groups }: TransactionGroupListProps) {
  return (
    <div>
      {groups.map((group) => (
        <div key={group.dateKey}>
          <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                {group.dateLabel}
              </span>
              <span className="block text-xs text-slate-500">
                {group.weekdayLabel}
              </span>
            </span>
            <span
              className={`text-sm font-semibold tabular-nums ${
                group.netTotal < 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {formatCurrency(Math.abs(group.netTotal))} {group.currency}
            </span>
          </div>

          {group.items.map((item) => (
            <TransactionRow key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}
