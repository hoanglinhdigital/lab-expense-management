"use client";

import { ChevronRight } from "lucide-react";
import type { AccountOption } from "@/lib/record-types";

interface AccountRowProps {
  /** Nhãn phía trước, dùng cho Transfer ("From" / "To"). */
  label?: string;
  account?: AccountOption;
  placeholder?: string;
  onSelect: () => void;
  error?: string;
}

export default function AccountRow({
  label,
  account,
  placeholder = "Chọn tài khoản",
  onSelect,
  error,
}: AccountRowProps) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {label ? (
          <span className="w-12 shrink-0 text-sm font-medium text-slate-800">
            {label}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onSelect}
          className={`flex min-h-11 flex-1 items-center gap-3 rounded-xl border px-3 py-2 text-left ${
            error ? "border-rose-600" : "border-slate-200"
          }`}
        >
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-800"
          >
            {account ? account.symbol : "?"}
          </span>
          {account ? (
            <span className="flex-1 truncate text-sm text-slate-800">
              {account.name}
              <span className="text-slate-500"> · {account.currency}</span>
            </span>
          ) : (
            <span className="flex-1 truncate text-sm text-slate-500">
              {placeholder}
            </span>
          )}
          <ChevronRight size={16} className="shrink-0 text-slate-500" aria-hidden />
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
