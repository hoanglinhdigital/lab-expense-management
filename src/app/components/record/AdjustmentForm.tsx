"use client";

import AccountRow from "./AccountRow";
import CategoryPickerCard from "./CategoryPickerCard";
import DateTimeRow from "./DateTimeRow";
import DescriptionRow from "./DescriptionRow";
import {
  amountToNumber,
  formatAmountInput,
  formatCurrency,
  parseAmountInput,
} from "@/lib/format";
import { adjustmentCategoryType, type RecordFormProps } from "@/lib/record-types";

export default function AdjustmentForm({
  form,
  options,
  errors,
  onChange,
  onOpenAccount,
  onOpenCategory,
  onAddCategory,
  onSelectCategory,
}: RecordFormProps) {
  const account = options.accounts.find((item) => item.id === form.fromAccountId);

  const currentBalance = account?.balance ?? 0;
  const difference = form.newBalance
    ? amountToNumber(form.newBalance) - currentBalance
    : 0;

  const categories = options.categories.filter(
    (item) => item.type === adjustmentCategoryType(difference),
  );

  return (
    <div className="flex flex-col gap-3">
      <CategoryPickerCard
        categories={categories}
        selectedId={form.categoryId}
        onSelect={onSelectCategory}
        onOpenAll={onOpenCategory}
        onAddNew={onAddCategory}
        error={errors.categoryId}
      />

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-4">
        <AccountRow
          account={account}
          onSelect={() => onOpenAccount("from")}
          error={errors.fromAccountId}
        />

        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm text-slate-500">
            Current Amount
          </span>
          <span className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm font-medium tabular-nums text-slate-800">
            {formatCurrency(currentBalance)}
          </span>
          <span className="w-10 shrink-0 text-sm text-slate-500">
            {account?.currency ?? "VND"}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <label
              htmlFor="record-new-balance"
              className="w-24 shrink-0 text-sm text-slate-500"
            >
              New Amount
            </label>
            <input
              id="record-new-balance"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={formatAmountInput(form.newBalance)}
              onChange={(event) =>
                onChange("newBalance", parseAmountInput(event.target.value))
              }
              aria-invalid={errors.newBalance ? true : undefined}
              // `min-w-0` để input co lại được trong flex, không đẩy hàng tràn ngang ở 375px.
              className={`min-h-11 w-full min-w-0 flex-1 rounded-xl border px-3 py-2 text-right text-sm font-medium tabular-nums text-slate-800 outline-none ${
                errors.newBalance
                  ? "border-rose-600"
                  : "border-slate-200 focus:border-emerald-600"
              }`}
            />
            <span className="w-10 shrink-0 text-sm text-slate-500">
              {account?.currency ?? "VND"}
            </span>
          </div>
          {errors.newBalance ? (
            <p className="mt-1 text-xs text-rose-600">{errors.newBalance}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm text-slate-500">Different</span>
          <span
            className={`flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm font-medium tabular-nums ${
              difference > 0
                ? "text-emerald-600"
                : difference < 0
                  ? "text-rose-600"
                  : "text-slate-800"
            }`}
          >
            {difference > 0 ? "+" : ""}
            {formatCurrency(difference)}
          </span>
          <span className="w-10 shrink-0 text-sm text-slate-500">
            {account?.currency ?? "VND"}
          </span>
        </div>

        <DateTimeRow
          date={form.date}
          time={form.time}
          onDateChange={(value) => onChange("date", value)}
          onTimeChange={(value) => onChange("time", value)}
        />
        <DescriptionRow
          id="record-note"
          value={form.note}
          onChange={(value) => onChange("note", value)}
        />
      </section>
    </div>
  );
}
