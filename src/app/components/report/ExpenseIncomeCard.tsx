import Link from "next/link";
import IncomeExpenseBars from "../home/IncomeExpenseBars";
import { formatCurrency } from "@/lib/format";
import type { FlowSummary } from "@/lib/home-types";

interface ExpenseIncomeCardProps {
  flow: FlowSummary;
}

interface FlowRowProps {
  label: string;
  amount: number;
  colorClass: string;
  currency: string;
}

function FlowRow({ label, amount, colorClass, currency }: FlowRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-slate-800">{label}</span>
      <span className={`text-sm font-medium tabular-nums ${colorClass}`}>
        {formatCurrency(amount)} {currency}
      </span>
    </div>
  );
}

export default function ExpenseIncomeCard({ flow }: ExpenseIncomeCardProps) {
  const different = flow.income - flow.expense;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium text-slate-800">
          Expense vs income
        </h2>
        <Link
          href="/report/expense-vs-income"
          className="-mr-2 flex min-h-11 items-center px-2 text-sm font-medium text-emerald-600"
        >
          View detail
        </Link>
      </div>

      <div className="mt-1">
        <IncomeExpenseBars flow={flow} />
      </div>

      <div className="mt-4 space-y-2">
        <FlowRow
          label="Income"
          amount={flow.income}
          colorClass="text-emerald-600"
          currency={flow.currency}
        />
        <FlowRow
          label="Expense"
          amount={flow.expense}
          colorClass="text-rose-600"
          currency={flow.currency}
        />
        <FlowRow
          label="Different"
          amount={different}
          colorClass={different < 0 ? "text-rose-600" : "text-slate-800"}
          currency={flow.currency}
        />
      </div>
    </section>
  );
}
