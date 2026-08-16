"use client";

import { EllipsisVertical } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  accountInitial,
  accountKindLabel,
  currencySymbol,
  type AccountItem,
} from "@/lib/account-types";

interface AccountListRowProps {
  account: AccountItem;
  /** Ẩn số dư theo công tắc chung ở header. */
  hidden: boolean;
  onMenu: (account: AccountItem) => void;
}

const MASK = "••••••";

export default function AccountListRow({
  account,
  hidden,
  onMenu,
}: AccountListRowProps) {
  return (
    <li className="flex items-center gap-3 border-t border-slate-200 px-4 py-3">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-800"
      >
        {accountInitial(account.name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-800">{account.name}</p>
        <p className="truncate text-xs font-medium tabular-nums text-slate-500">
          {hidden
            ? MASK
            : `${formatCurrency(account.balance)} ${currencySymbol(account.currency)}`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onMenu(account)}
        aria-label={`Tuỳ chọn cho ${account.name} (${accountKindLabel(account.kind)})`}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-slate-500"
      >
        <EllipsisVertical size={16} aria-hidden />
      </button>
    </li>
  );
}
