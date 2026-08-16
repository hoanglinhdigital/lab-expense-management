"use client";

import AmountField from "./AmountField";
import AccountRow from "./AccountRow";
import DateTimeRow from "./DateTimeRow";
import DescriptionRow from "./DescriptionRow";
import { rateKey, type RecordFormProps } from "@/lib/record-types";

export default function TransferForm({
  form,
  options,
  errors,
  config,
  onChange,
  onOpenAccount,
}: RecordFormProps) {
  const from = options.accounts.find((item) => item.id === form.fromAccountId);
  const to = options.accounts.find((item) => item.id === form.toAccountId);
  const crossCurrency =
    from !== undefined && to !== undefined && from.currency !== to.currency;
  const rate = crossCurrency
    ? options.exchangeRates[rateKey(from.currency, to.currency)]
    : undefined;

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-2xl bg-white p-4">
        <AmountField
          id="record-amount"
          label="Amount"
          value={form.amount}
          onChange={(value) => onChange("amount", value)}
          currency={from?.currency ?? "VND"}
          accentClass={config.textClass}
          error={errors.amount}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-4">
        <AccountRow
          label="From"
          account={from}
          onSelect={() => onOpenAccount("from")}
          error={errors.fromAccountId}
        />
        <AccountRow
          label="To"
          account={to}
          placeholder="Chọn tài khoản đích"
          onSelect={() => onOpenAccount("to")}
          error={errors.toAccountId}
        />

        {crossCurrency ? (
          <div>
            <AmountField
              id="record-receive-amount"
              label="Amount receive"
              value={form.receiveAmount}
              onChange={(value) => onChange("receiveAmount", value)}
              currency={to.currency}
              accentClass={config.textClass}
              error={errors.receiveAmount}
            />
            {rate !== undefined ? (
              <p className="mt-1 text-xs text-slate-500">
                rate: 1 {from.currency} ~ {rate} {to.currency}
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-500">
                Chưa có tỷ giá cho cặp tiền tệ này, vui lòng nhập số tiền nhận thủ công.
              </p>
            )}
          </div>
        ) : null}

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
