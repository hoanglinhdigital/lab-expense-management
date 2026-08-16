"use client";

import { Eye, EyeOff, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { currencySymbol } from "@/lib/account-types";

interface AccountHeaderProps {
  totalBalance: number;
  currency: string;
  hidden: boolean;
  onToggle: () => void;
  onAdd: () => void;
}

const MASK = "••••••••";

export default function AccountHeader({
  totalBalance,
  currency,
  hidden,
  onToggle,
  onAdd,
}: AccountHeaderProps) {
  return (
    <header className="bg-emerald-600 px-4 pb-10 pt-6">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-xl font-semibold text-white">My account</h1>

        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">Total balance</p>
            <div className="mt-1 flex items-center gap-2">
              <p
                className="min-w-0 truncate text-xl font-semibold tabular-nums text-slate-800"
                aria-live="polite"
              >
                {hidden
                  ? MASK
                  : `${formatCurrency(totalBalance)} ${currencySymbol(currency)}`}
              </p>
              <button
                type="button"
                onClick={onToggle}
                aria-label={hidden ? "Hiện số dư" : "Ẩn số dư"}
                aria-pressed={hidden}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-slate-500"
              >
                {hidden ? (
                  <EyeOff size={16} aria-hidden />
                ) : (
                  <Eye size={16} aria-hidden />
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onAdd}
            aria-label="Thêm tài khoản"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus size={24} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
