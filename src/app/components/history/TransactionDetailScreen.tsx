"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import FormAlert from "../FormAlert";
import ExpenseIncomeForm from "../record/ExpenseIncomeForm";
import TransferForm from "../record/TransferForm";
import BorrowLendForm from "../record/BorrowLendForm";
import AccountSheet from "../record/AccountSheet";
import CategorySheet from "../record/CategorySheet";
import ContactSheet from "../record/ContactSheet";
import ContactCreateDialog from "../record/ContactCreateDialog";
import CategoryFormPanel from "../record/CategoryFormPanel";
import DeleteTransactionDialog from "./DeleteTransactionDialog";
import {
  createCategory,
  createContact,
  fetchRecordOptions,
} from "@/lib/record-client";
import {
  deleteTransaction,
  fetchTransactionDetail,
  updateTransaction,
} from "@/lib/history-client";
import { ApiClientError, isUnauthorized } from "@/lib/api/client";
import { amountToNumber } from "@/lib/format";
import {
  getRecordTypeConfig,
  rateKey,
  type CategoryType,
  type RecordFieldErrors,
  type RecordFormState,
  type RecordOptions,
} from "@/lib/record-types";

type Status = "loading" | "ready" | "error";

type Overlay =
  | { kind: "none" }
  | { kind: "account"; target: "from" | "to" }
  | { kind: "category" }
  | { kind: "category-form"; type: CategoryType }
  | { kind: "contact" }
  | { kind: "contact-create" };

const COMING_SOON = "Tính năng đang phát triển, vui lòng quay lại sau.";
const LOAD_ERROR = "Không tải được dữ liệu giao dịch.";

export default function TransactionDetailScreen() {
  const router = useRouter();
  const params = useParams<{ transactionId: string }>();
  const transactionId = params.transactionId;

  const [status, setStatus] = useState<Status>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [options, setOptions] = useState<RecordOptions | null>(null);
  const [form, setForm] = useState<RecordFormState | null>(null);
  const [errors, setErrors] = useState<RecordFieldErrors>({});
  const [overlay, setOverlay] = useState<Overlay>({ kind: "none" });
  const [categorySheetType, setCategorySheetType] =
    useState<CategoryType>("EXPENSE");
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Tăng lên mỗi lần bấm "Thử lại" để chạy lại effect tải dữ liệu. */
  const [reloadToken, setReloadToken] = useState(0);

  // setState chỉ nằm trong callback của promise, không gọi đồng bộ trong thân
  // effect — tránh cascading render (rule `react-hooks/set-state-in-effect`).
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRecordOptions(), fetchTransactionDetail(transactionId)]).then(
      ([recordOptions, detail]) => {
        if (cancelled) return;
        setOptions(recordOptions);
        setForm(detail.form);
        setCategorySheetType(
          getRecordTypeConfig(detail.type).categoryType ?? "EXPENSE",
        );
        setStatus("ready");
      },
      (error: unknown) => {
        if (cancelled) return;
        if (isUnauthorized(error)) {
          router.replace("/login");
          return;
        }
        setLoadError(error instanceof ApiClientError ? error.message : LOAD_ERROR);
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [transactionId, reloadToken, router]);

  if (status === "loading" || !form) return <DetailSkeleton />;

  if (status === "error" || !options) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4">
        <FormAlert
          tone="error"
          message={loadError ?? LOAD_ERROR}
          onRetry={() => {
            setStatus("loading");
            setReloadToken((token) => token + 1);
          }}
        />
      </div>
    );
  }

  const config = getRecordTypeConfig(form.type);

  function updateField<K extends keyof RecordFormState>(
    field: K,
    value: RecordFormState[K],
  ) {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setForm((previous) => {
      if (!previous) return previous;
      const next = { ...previous, [field]: value };
      if (next.type === "TRANSFER") return withConvertedAmount(next, options);
      return next;
    });
  }

  function validate(currentForm: RecordFormState): RecordFieldErrors {
    const next: RecordFieldErrors = {};
    const account = options?.accounts.find(
      (item) => item.id === currentForm.fromAccountId,
    );

    if (!currentForm.fromAccountId) next.fromAccountId = "Vui lòng chọn tài khoản.";

    if (config.hasAmount && amountToNumber(currentForm.amount) <= 0) {
      next.amount = "Vui lòng nhập số tiền lớn hơn 0.";
    }

    if (config.hasCategory && !currentForm.categoryId) {
      next.categoryId = "Vui lòng chọn danh mục.";
    }

    if (config.hasToAccount) {
      if (!currentForm.toAccountId) {
        next.toAccountId = "Vui lòng chọn tài khoản đích.";
      } else if (currentForm.toAccountId === currentForm.fromAccountId) {
        next.toAccountId = "Tài khoản đích phải khác tài khoản nguồn.";
      } else {
        const to = options?.accounts.find(
          (item) => item.id === currentForm.toAccountId,
        );
        if (
          account &&
          to &&
          account.currency !== to.currency &&
          amountToNumber(currentForm.receiveAmount) <= 0
        ) {
          next.receiveAmount = "Vui lòng nhập số tiền nhận.";
        }
      }
    }

    if (config.hasContact && !currentForm.contactId) {
      next.contactId = "Vui lòng chọn contact.";
    }

    return next;
  }

  async function submit() {
    if (!form) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setFormError(null);
    setPending(true);
    try {
      await updateTransaction(transactionId, form);
      setNotice("Đã lưu thay đổi.");
      router.back();
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : "Không lưu được giao dịch. Vui lòng thử lại.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    await deleteTransaction(transactionId);
    router.back();
  }

  async function handleCreateCategory(input: {
    name: string;
    icon: string;
    type: CategoryType;
    parentId: string | null;
  }) {
    const category = await createCategory(input);
    setOptions((previous) =>
      previous
        ? { ...previous, categories: [...previous.categories, category] }
        : previous,
    );
    if (category.type === config.categoryType) {
      updateField("categoryId", category.id);
    }
    setOverlay({ kind: "none" });
  }

  async function handleCreateContact(name: string) {
    const contact = await createContact(name);
    setOptions((previous) =>
      previous
        ? { ...previous, contacts: [...previous.contacts, contact] }
        : previous,
    );
    updateField("contactId", contact.id);
    setOverlay({ kind: "none" });
  }

  const formProps = {
    form,
    options,
    errors,
    config,
    onChange: updateField,
    onOpenAccount: (target: "from" | "to") =>
      setOverlay({ kind: "account", target }),
    onOpenCategory: () => setOverlay({ kind: "category" }),
    onAddCategory: () =>
      setOverlay({ kind: "category-form" as const, type: config.categoryType ?? "EXPENSE" }),
    onSelectCategory: (categoryId: string) => updateField("categoryId", categoryId),
    onOpenContact: () => setOverlay({ kind: "contact" }),
  };

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto w-full max-w-2xl p-4">
        <header className="relative flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Quay lại"
            className="flex min-h-11 min-w-11 items-center justify-center text-slate-800"
          >
            <ArrowLeft size={24} aria-hidden />
          </button>
          <span
            className={`flex min-h-11 items-center rounded-full border-2 px-5 py-2 text-base font-medium ${config.borderClass} ${config.textClass}`}
          >
            {config.label}
          </span>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={pending}
            aria-label="Lưu nhanh"
            className="flex min-h-11 min-w-11 items-center justify-center text-slate-800 disabled:text-slate-400"
          >
            <Check size={24} aria-hidden />
          </button>
        </header>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="mt-4 flex flex-col gap-3"
        >
          {formError ? (
            <FormAlert tone="error" message={formError} onRetry={() => void submit()} />
          ) : null}
          {notice ? <FormAlert tone="info" message={notice} /> : null}

          {form.type === "TRANSFER" ? (
            <TransferForm {...formProps} />
          ) : form.type === "BORROW" || form.type === "LEND" ? (
            <BorrowLendForm {...formProps} />
          ) : (
            <ExpenseIncomeForm {...formProps} />
          )}

          <div className="flex flex-col items-center gap-2 py-2">
            <button
              type="button"
              onClick={() => setNotice(COMING_SOON)}
              className="min-h-11 text-sm font-medium text-emerald-600"
            >
              Show more details
            </button>
            <button
              type="button"
              onClick={() => setNotice(COMING_SOON)}
              className="min-h-11 text-sm font-medium text-emerald-600"
            >
              Share
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="min-h-11 flex-1 rounded-full border border-rose-600 px-4 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              Delete
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 flex-1 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {pending ? "Đang lưu..." : "Save"}
            </button>
          </div>
        </form>
      </div>

      {overlay.kind === "account" ? (
        <AccountSheet
          title={overlay.target === "to" ? "Tài khoản đích" : "Select Account"}
          accounts={options.accounts}
          selectedId={overlay.target === "to" ? form.toAccountId : form.fromAccountId}
          onSelect={(accountId) => {
            updateField(
              overlay.target === "to" ? "toAccountId" : "fromAccountId",
              accountId,
            );
            setOverlay({ kind: "none" });
          }}
          onClose={() => setOverlay({ kind: "none" })}
        />
      ) : null}

      {overlay.kind === "category" ? (
        <CategorySheet
          categories={options.categories}
          activeType={categorySheetType}
          onTypeChange={setCategorySheetType}
          allowTypeSwitch={false}
          selectedId={form.categoryId}
          onSelect={(categoryId) => {
            updateField("categoryId", categoryId);
            setOverlay({ kind: "none" });
          }}
          onAddNew={() =>
            setOverlay({ kind: "category-form", type: categorySheetType })
          }
          onClose={() => setOverlay({ kind: "none" })}
        />
      ) : null}

      {overlay.kind === "category-form" ? (
        <CategoryFormPanel
          type={overlay.type}
          categories={options.categories}
          onBack={() => setOverlay({ kind: "none" })}
          onSubmit={handleCreateCategory}
        />
      ) : null}

      {overlay.kind === "contact" ? (
        <ContactSheet
          contacts={options.contacts}
          selectedId={form.contactId}
          onSelect={(contactId) => {
            updateField("contactId", contactId);
            setOverlay({ kind: "none" });
          }}
          onCreate={() => setOverlay({ kind: "contact-create" })}
          onClose={() => setOverlay({ kind: "none" })}
        />
      ) : null}

      {overlay.kind === "contact-create" ? (
        <ContactCreateDialog
          existingNames={options.contacts.map((item) => item.name)}
          onCancel={() => setOverlay({ kind: "contact" })}
          onSubmit={handleCreateContact}
        />
      ) : null}

      {deleteOpen ? (
        <DeleteTransactionDialog
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}

/** Quy đổi số tiền nhận khi Transfer giữa hai loại tiền tệ khác nhau — giống `RecordScreen`. */
function withConvertedAmount(
  next: RecordFormState,
  options: RecordOptions | null,
): RecordFormState {
  if (!options) return next;
  const from = options.accounts.find((item) => item.id === next.fromAccountId);
  const to = options.accounts.find((item) => item.id === next.toAccountId);
  if (!from || !to || from.currency === to.currency) {
    return { ...next, receiveAmount: "" };
  }
  const rate = options.exchangeRates[rateKey(from.currency, to.currency)];
  if (rate === undefined || !next.amount) return next;
  const converted = amountToNumber(next.amount) * rate;
  return { ...next, receiveAmount: converted.toFixed(2) };
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl p-4" aria-busy>
      <span className="sr-only">Đang tải dữ liệu</span>
      <div className="flex justify-center">
        <div className="h-11 w-40 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-44 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-11 animate-pulse rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
