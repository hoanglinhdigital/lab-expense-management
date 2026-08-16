"use client";

import { formatAmountInput, parseAmountInput } from "@/lib/format";

interface AmountFieldProps {
  id: string;
  label: string;
  /** Chuỗi số thô, chưa có phân cách hàng nghìn. */
  value: string;
  onChange: (value: string) => void;
  currency: string;
  /** Class màu nhấn theo loại giao dịch. */
  accentClass: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export default function AmountField({
  id,
  label,
  value,
  onChange,
  currency,
  accentClass,
  error,
  disabled,
  readOnly,
}: AmountFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-center text-sm text-slate-500">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          disabled={disabled}
          readOnly={readOnly}
          value={formatAmountInput(value)}
          onChange={(event) => onChange(parseAmountInput(event.target.value))}
          aria-invalid={error ? true : undefined}
          className={`min-h-11 w-full rounded-xl border bg-white px-3 py-2 text-right text-xl font-medium tabular-nums outline-none read-only:bg-slate-50 disabled:bg-slate-50 ${accentClass} ${
            error ? "border-rose-600" : "border-slate-200 focus:border-emerald-600"
          }`}
        />
        <span className={`shrink-0 text-sm font-medium ${accentClass}`}>
          {currency}
        </span>
      </div>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
