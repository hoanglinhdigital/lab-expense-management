"use client";

import { useState } from "react";
import {
  AlignLeft,
  Check,
  ChevronRight,
  CreditCard,
  DollarSign,
  Repeat,
} from "lucide-react";
import FullScreenPanel from "../FullScreenPanel";
import FormAlert from "../FormAlert";
import AccountKindSheet from "./AccountKindSheet";
import CurrencySheet from "./CurrencySheet";
import { ApiClientError } from "@/lib/api/client";
import { amountToNumber, formatAmountInput, parseAmountInput } from "@/lib/format";
import {
  accountKindLabel,
  createEmptyAccountForm,
  currencySymbol,
  MAX_ACCOUNT_DESCRIPTION_LENGTH,
  MAX_ACCOUNT_NAME_LENGTH,
  type AccountFieldErrors,
  type AccountFormState,
} from "@/lib/account-types";

interface AccountFormPanelProps {
  /** Tên các tài khoản đã có, để chặn trùng tên (schema có ràng buộc unique). */
  existingNames: string[];
  onBack: () => void;
  onSubmit: (form: AccountFormState) => Promise<void>;
}

type Sheet = "none" | "kind" | "currency";

const FORM_ID = "account-form";

export default function AccountFormPanel({
  existingNames,
  onBack,
  onSubmit,
}: AccountFormPanelProps) {
  const [form, setForm] = useState<AccountFormState>(createEmptyAccountForm);
  const [errors, setErrors] = useState<AccountFieldErrors>({});
  const [sheet, setSheet] = useState<Sheet>("none");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update<K extends keyof AccountFormState>(
    field: K,
    value: AccountFormState[K],
  ) {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function validate(): AccountFieldErrors {
    const next: AccountFieldErrors = {};
    const name = form.name.trim();

    if (!name) {
      next.name = "Vui lòng nhập tên tài khoản.";
    } else if (name.length > MAX_ACCOUNT_NAME_LENGTH) {
      next.name = `Tên tối đa ${MAX_ACCOUNT_NAME_LENGTH} ký tự.`;
    } else if (
      existingNames.some((item) => item.toLowerCase() === name.toLowerCase())
    ) {
      next.name = "Tài khoản này đã tồn tại.";
    }

    if (form.balance && amountToNumber(form.balance) < 0) {
      next.balance = "Số dư khởi tạo không được âm.";
    }

    return next;
  }

  async function submit() {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitError(null);
    setPending(true);
    try {
      await onSubmit({ ...form, name: form.name.trim() });
    } catch (error) {
      setSubmitError(
        error instanceof ApiClientError
          ? error.message
          : "Không tạo được tài khoản. Vui lòng thử lại.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <FullScreenPanel
      title="Add Account"
      // Khi sheet đang mở, phím Esc chỉ đóng sheet — không thoát cả form đang nhập dở.
      onBack={sheet === "none" ? onBack : () => setSheet("none")}
      action={
        <button
          type="submit"
          form={FORM_ID}
          disabled={pending}
          aria-label="Lưu tài khoản"
          className="flex min-h-11 min-w-11 items-center justify-center text-emerald-600 disabled:text-slate-500"
        >
          <Check size={24} aria-hidden />
        </button>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-3 p-4"
      >
        {submitError ? (
          <FormAlert
            tone="error"
            message={submitError}
            onRetry={() => void submit()}
          />
        ) : null}

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label
            htmlFor="account-balance"
            className="block text-center text-sm text-slate-500"
          >
            Initial balance
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="account-balance"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              disabled={pending}
              value={formatAmountInput(form.balance)}
              onChange={(event) =>
                update("balance", parseAmountInput(event.target.value))
              }
              aria-invalid={errors.balance ? true : undefined}
              className={`min-h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 py-2 text-right text-xl font-medium tabular-nums text-emerald-600 outline-none disabled:bg-slate-50 ${
                errors.balance
                  ? "border-rose-600"
                  : "border-slate-200 focus:border-emerald-600"
              }`}
            />
            <span className="shrink-0 text-xl font-medium text-emerald-600">
              {currencySymbol(form.currency)}
            </span>
          </div>
          {errors.balance ? (
            <p className="mt-1 text-xs text-rose-600">{errors.balance}</p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="px-4 py-2">
            <label htmlFor="account-name" className="sr-only">
              Account name
            </label>
            <div className="flex items-center gap-3">
              <DollarSign size={16} className="shrink-0 text-slate-500" aria-hidden />
              <input
                id="account-name"
                value={form.name}
                maxLength={MAX_ACCOUNT_NAME_LENGTH}
                disabled={pending}
                placeholder="Account name"
                onChange={(event) => update("name", event.target.value)}
                aria-invalid={errors.name ? true : undefined}
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none"
              />
            </div>
            {errors.name ? (
              <p className="pb-1 text-xs text-rose-600">{errors.name}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setSheet("kind")}
            className="flex min-h-11 w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-left"
          >
            <CreditCard size={16} className="shrink-0 text-slate-500" aria-hidden />
            <span className="flex-1 truncate text-sm text-slate-800">
              {accountKindLabel(form.kind)}
            </span>
            <ChevronRight size={16} className="shrink-0 text-slate-500" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setSheet("currency")}
            className="flex min-h-11 w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-left"
          >
            <Repeat size={16} className="shrink-0 text-slate-500" aria-hidden />
            <span className="flex-1 truncate text-sm text-slate-800">
              {form.currency}
            </span>
            <ChevronRight size={16} className="shrink-0 text-slate-500" aria-hidden />
          </button>

          <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-2">
            <AlignLeft size={16} className="shrink-0 text-slate-500" aria-hidden />
            <label htmlFor="account-description" className="sr-only">
              Description
            </label>
            <input
              id="account-description"
              value={form.description}
              maxLength={MAX_ACCOUNT_DESCRIPTION_LENGTH}
              disabled={pending}
              placeholder="Description"
              onChange={(event) => update("description", event.target.value)}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
        >
          {pending ? "Đang lưu..." : "Save"}
        </button>
      </form>

      {sheet === "kind" ? (
        <AccountKindSheet
          value={form.kind}
          onSelect={(kind) => {
            update("kind", kind);
            setSheet("none");
          }}
          onClose={() => setSheet("none")}
        />
      ) : null}

      {sheet === "currency" ? (
        <CurrencySheet
          value={form.currency}
          onSelect={(code) => {
            update("currency", code);
            setSheet("none");
          }}
          onClose={() => setSheet("none")}
        />
      ) : null}
    </FullScreenPanel>
  );
}
