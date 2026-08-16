import { HandCoins, PiggyBank } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LoanItem } from "@/lib/home-types";

interface LoanRowProps {
  loan: LoanItem;
  currency: string;
}

export default function LoanRow({ loan, currency }: LoanRowProps) {
  const isLend = loan.kind === "LEND";
  // LEND = tiền mình đưa ra (rose), BORROW = tiền vào tay mình (emerald).
  const Icon = isLend ? HandCoins : PiggyBank;

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
      <span
        aria-hidden
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
          isLend ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
        }`}
      >
        <Icon size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">
          {isLend ? "Loan" : "Borrowing"}
        </p>
        <p className="truncate text-sm text-slate-500">{loan.note}</p>
        <p className="text-xs text-slate-500">
          Transaction date:{" "}
          <span className="tabular-nums">{formatDate(loan.date)}</span>
        </p>
      </div>

      <span
        className={`shrink-0 self-start text-right text-sm font-medium tabular-nums ${
          isLend ? "text-rose-600" : "text-emerald-600"
        }`}
      >
        {formatCurrency(loan.amount)} {currency}
      </span>
    </li>
  );
}
