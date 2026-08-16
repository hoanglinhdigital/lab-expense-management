"use client";

import { ChevronRight, User } from "lucide-react";
import AmountField from "./AmountField";
import AccountRow from "./AccountRow";
import DateTimeRow from "./DateTimeRow";
import DescriptionRow from "./DescriptionRow";
import type { RecordFormProps } from "@/lib/record-types";

export default function BorrowLendForm({
  form,
  options,
  errors,
  config,
  onChange,
  onOpenAccount,
  onOpenContact,
}: RecordFormProps) {
  const account = options.accounts.find((item) => item.id === form.fromAccountId);
  const contact = options.contacts.find((item) => item.id === form.contactId);

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

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-4">
        <AccountRow
          account={account}
          onSelect={() => onOpenAccount("from")}
          error={errors.fromAccountId}
        />

        <div>
          <button
            type="button"
            onClick={onOpenContact}
            className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${
              errors.contactId ? "border-rose-600" : "border-slate-200"
            }`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <User size={16} className="text-slate-500" aria-hidden />
            </span>
            <span
              className={`flex-1 truncate text-sm ${
                contact ? "text-slate-800" : "text-slate-500"
              }`}
            >
              {contact ? contact.name : "Chọn contact"}
            </span>
            <ChevronRight size={16} className="shrink-0 text-slate-500" aria-hidden />
          </button>
          {errors.contactId ? (
            <p className="mt-1 text-xs text-rose-600">{errors.contactId}</p>
          ) : null}
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
