"use client";

import AmountField from "./AmountField";
import AccountRow from "./AccountRow";
import CategoryPickerCard from "./CategoryPickerCard";
import DateTimeRow from "./DateTimeRow";
import DescriptionRow from "./DescriptionRow";
import type { RecordFormProps } from "@/lib/record-types";

export default function ExpenseIncomeForm({
  form,
  options,
  errors,
  config,
  onChange,
  onOpenAccount,
  onOpenCategory,
  onAddCategory,
  onSelectCategory,
}: RecordFormProps) {
  const account = options.accounts.find((item) => item.id === form.fromAccountId);
  const categories = options.categories.filter(
    (item) => item.type === config.categoryType,
  );

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-2xl bg-white p-4">
        <AmountField
          id="record-amount"
          label="Amount"
          value={form.amount}
          onChange={(value) => onChange("amount", value)}
          currency={account?.currency ?? "VND"}
          accentClass={config.textClass}
          error={errors.amount}
        />
      </section>

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
