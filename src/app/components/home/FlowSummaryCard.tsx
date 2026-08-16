"use client";

import Link from "next/link";
import CategoryDonut from "./CategoryDonut";
import IncomeExpenseBars from "./IncomeExpenseBars";
import { formatCurrency } from "@/lib/format";
import type { CategorySlice, FlowSummary } from "@/lib/home-types";

interface FlowSummaryCardProps {
  flow: FlowSummary;
  expenseByCategory: CategorySlice[];
  onHistory: () => void;
}

interface FlowRowProps {
  label: string;
  amount: number;
  colorClass: string;
  currency?: string;
}

function FlowRow({ label, amount, colorClass, currency }: FlowRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-slate-800">{label}</span>
      <span className={`text-sm font-medium tabular-nums ${colorClass}`}>
        {formatCurrency(amount)}
        {currency ? ` ${currency}` : ""}
      </span>
    </div>
  );
}

export default function FlowSummaryCard({
  flow,
  expenseByCategory,
  onHistory,
}: FlowSummaryCardProps) {
  const different = flow.income - flow.expense;
  const isEmpty = flow.income === 0 && flow.expense === 0;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-base font-medium text-slate-800">Expense vs income</h2>

      {isEmpty ? (
        <div className="py-6 text-center">
          <p className="text-sm text-slate-800">
            Chưa có giao dịch nào trong kỳ này
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Ghi khoản thu hoặc chi đầu tiên để xem so sánh thu — chi.
          </p>
          <Link
            href="/record"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Ghi giao dịch
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-3">
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

          {expenseByCategory.length > 0 ? (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <CategoryDonut slices={expenseByCategory} />
            </div>
          ) : null}
        </>
      )}

      <button
        type="button"
        onClick={onHistory}
        className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        Transaction history
      </button>
    </section>
  );
}
