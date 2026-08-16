"use client";

import { Check } from "lucide-react";
import BottomSheet from "../BottomSheet";
import { formatCurrency } from "@/lib/format";
import type { AccountOption } from "@/lib/record-types";

interface AccountSheetProps {
  title?: string;
  accounts: AccountOption[];
  selectedId: string;
  onSelect: (accountId: string) => void;
  onClose: () => void;
}

export default function AccountSheet({
  title = "Select Account",
  accounts,
  selectedId,
  onSelect,
  onClose,
}: AccountSheetProps) {
  return (
    <BottomSheet title={title} onClose={onClose}>
      {accounts.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">
          Bạn chưa có tài khoản nào.
        </p>
      ) : (
        <ul>
          {accounts.map((account) => {
            const selected = account.id === selectedId;
            return (
              <li key={account.id}>
                <button
                  type="button"
                  onClick={() => onSelect(account.id)}
                  className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-800"
                  >
                    {account.symbol}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm text-slate-800">
                      {account.name}
                    </span>
                    <span className="block text-xs font-medium tabular-nums text-slate-500">
                      {formatCurrency(account.balance)} {account.currency}
                    </span>
                  </span>
                  {selected ? (
                    <Check size={16} className="shrink-0 text-emerald-600" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </BottomSheet>
  );
}
