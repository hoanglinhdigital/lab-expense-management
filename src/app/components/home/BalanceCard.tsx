"use client";

import { Eye, EyeOff } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { BalanceSummary } from "@/lib/home-types";

interface BalanceCardProps {
  balance: BalanceSummary;
  hidden: boolean;
  onToggle: () => void;
}

const MASK = "••••••••";

export default function BalanceCard({
  balance,
  hidden,
  onToggle,
}: BalanceCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">Total Balance</p>
      <div className="mt-2 flex items-center gap-2">
        <p
          className="min-w-0 flex-1 truncate text-xl font-semibold tabular-nums text-slate-800"
          aria-live="polite"
        >
          {hidden ? MASK : formatCurrency(balance.total)}
        </p>
        <span className="shrink-0 text-sm font-medium text-slate-800">
          {balance.currency}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label={hidden ? "Hiện số dư" : "Ẩn số dư"}
          aria-pressed={hidden}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-slate-500"
        >
          {hidden ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
