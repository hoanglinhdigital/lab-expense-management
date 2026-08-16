"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormAlert from "../FormAlert";
import RecordHeader from "./RecordHeader";
import SaveButton from "./SaveButton";
import ExpenseIncomeForm from "./ExpenseIncomeForm";
import TransferForm from "./TransferForm";
import BorrowLendForm from "./BorrowLendForm";
import AdjustmentForm from "./AdjustmentForm";
import AccountSheet from "./AccountSheet";
import CategorySheet from "./CategorySheet";
import ContactSheet from "./ContactSheet";
import ContactCreateDialog from "./ContactCreateDialog";
import CategoryFormPanel from "./CategoryFormPanel";
import {
  createCategory,
  createContact,
  fetchRecordOptions,
  saveTransaction,
} from "@/lib/record-client";
import { ApiClientError, isUnauthorized } from "@/lib/api/client";
import {
  amountToNumber,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/format";
import {
  adjustmentCategoryType,
  getRecordTypeConfig,
  rateKey,
  type CategoryType,
  type RecordFieldErrors,
  type RecordFormState,
  type RecordOptions,
  type RecordType,
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

function createInitialForm(): RecordFormState {
  const now = new Date();
  return {
    type: "EXPENSE",
    amount: "",
    receiveAmount: "",
    newBalance: "",
    fromAccountId: "",
    toAccountId: "",
    categoryId: "",
    contactId: "",
    date: toDateInputValue(now),
    time: toTimeInputValue(now),
    note: "",
  };
}

export default function RecordScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [options, setOptions] = useState<RecordOptions | null>(null);
  const [form, setForm] = useState<RecordFormState>(createInitialForm);
  const [errors, setErrors] = useState<RecordFieldErrors>({});
  const [overlay, setOverlay] = useState<Overlay>({ kind: "none" });
  const [categorySheetType, setCategorySheetType] =
    useState<CategoryType>("EXPENSE");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Tăng lên mỗi lần bấm "Thử lại" để chạy lại effect tải dữ liệu. */
  const [reloadToken, setReloadToken] = useState(0);

  // setState chỉ nằm trong callback của promise, không gọi đồng bộ trong thân
  // effect — tránh cascading render (rule `react-hooks/set-state-in-effect`).
  useEffect(() => {
    let cancelled = false;
    fetchRecordOptions().then(
      (result) => {
        if (cancelled) return;
        setOptions(result);
        setForm((previous) => ({
          ...previous,
          fromAccountId: previous.fromAccountId || (result.accounts[0]?.id ?? ""),
        }));
        setStatus("ready");
      },
      (error: unknown) => {
        if (cancelled) return;
        if (isUnauthorized(error)) {
          router.replace("/login");
          return;
        }
        setLoadError(
          error instanceof ApiClientError
            ? error.message
            : "Không tải được dữ liệu tài khoản và danh mục.",
        );
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloadToken, router]);

  const config = getRecordTypeConfig(form.type);

  function updateField<K extends keyof RecordFormState>(
    field: K,
    value: RecordFormState[K],
  ) {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      if (next.type === "TRANSFER") return withConvertedAmount(next);
      if (
        next.type === "ADJUSTMENT" &&
        (field === "newBalance" || field === "fromAccountId")
      ) {
        return withAdjustmentCategoryReset(next, previous);
      }
      return next;
    });
  }

  /**
   * Category cho phép chọn ở Adjustment đổi theo dấu của `newBalance − balance`
   * (âm -> EXPENSE, dương/0 -> INCOME — xem `adjustmentCategoryType`). Đổi dấu
   * thì category cũ không còn hợp lệ với type sẽ gửi lên, phải xoá lựa chọn.
   */
  function withAdjustmentCategoryReset(
    next: RecordFormState,
    previous: RecordFormState,
  ): RecordFormState {
    const account = options?.accounts.find(
      (item) => item.id === next.fromAccountId,
    );
    const balance = account?.balance ?? 0;
    const previousDiff = previous.newBalance
      ? amountToNumber(previous.newBalance) - balance
      : 0;
    const nextDiff = next.newBalance
      ? amountToNumber(next.newBalance) - balance
      : 0;
    if (adjustmentCategoryType(previousDiff) === adjustmentCategoryType(nextDiff)) {
      return next;
    }
    return { ...next, categoryId: "" };
  }

  /** Type danh mục hiệu lực cho form hiện tại — Adjustment tính động theo dấu chênh lệch. */
  function currentCategoryType(): CategoryType {
    if (form.type !== "ADJUSTMENT") return config.categoryType ?? "EXPENSE";
    const account = options?.accounts.find(
      (item) => item.id === form.fromAccountId,
    );
    const difference = form.newBalance
      ? amountToNumber(form.newBalance) - (account?.balance ?? 0)
      : 0;
    return adjustmentCategoryType(difference);
  }

  /** Tự quy đổi số tiền nhận khi Transfer giữa hai loại tiền tệ khác nhau. */
  function withConvertedAmount(next: RecordFormState): RecordFormState {
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

  function handleTypeChange(type: RecordType) {
    const nextConfig = getRecordTypeConfig(type);
    setErrors({});
    setFormError(null);
    setForm((previous) => ({
      ...previous,
      type,
      // Giữ các field dùng chung (số tiền, tài khoản, ngày giờ, ghi chú);
      // chỉ xoá field không còn ý nghĩa với loại giao dịch mới.
      categoryId:
        nextConfig.categoryType &&
        nextConfig.categoryType === config.categoryType
          ? previous.categoryId
          : "",
      toAccountId: nextConfig.hasToAccount ? previous.toAccountId : "",
      contactId: nextConfig.hasContact ? previous.contactId : "",
      receiveAmount: nextConfig.hasToAccount ? previous.receiveAmount : "",
      newBalance: nextConfig.hasBalanceAdjust ? previous.newBalance : "",
    }));
    if (nextConfig.categoryType) setCategorySheetType(nextConfig.categoryType);
  }

  function validate(): RecordFieldErrors {
    const next: RecordFieldErrors = {};
    const account = options?.accounts.find(
      (item) => item.id === form.fromAccountId,
    );

    if (!form.fromAccountId) next.fromAccountId = "Vui lòng chọn tài khoản.";

    if (config.hasAmount && amountToNumber(form.amount) <= 0) {
      next.amount = "Vui lòng nhập số tiền lớn hơn 0.";
    }

    if (config.hasCategory && !form.categoryId) {
      next.categoryId = "Vui lòng chọn danh mục.";
    }

    if (config.hasToAccount) {
      if (!form.toAccountId) {
        next.toAccountId = "Vui lòng chọn tài khoản đích.";
      } else if (form.toAccountId === form.fromAccountId) {
        next.toAccountId = "Tài khoản đích phải khác tài khoản nguồn.";
      } else {
        const to = options?.accounts.find((item) => item.id === form.toAccountId);
        if (
          account &&
          to &&
          account.currency !== to.currency &&
          amountToNumber(form.receiveAmount) <= 0
        ) {
          next.receiveAmount = "Vui lòng nhập số tiền nhận.";
        }
      }
    }

    if (config.hasContact && !form.contactId) {
      next.contactId = "Vui lòng chọn contact.";
    }

    if (config.hasBalanceAdjust) {
      if (!form.newBalance) {
        next.newBalance = "Vui lòng nhập số dư mới.";
      } else if (amountToNumber(form.newBalance) === (account?.balance ?? 0)) {
        next.newBalance = "Số dư mới phải khác số dư hiện tại.";
      }
    }

    return next;
  }

  async function submit() {
    // Form chỉ render sau khi `options` đã tải xong (xem guard `!options` bên
    // dưới) nên nhánh này không xảy ra lúc chạy — chỉ để TypeScript hẹp kiểu.
    if (!options) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setFormError(null);
    setNotice(null);
    setPending(true);
    try {
      await saveTransaction(form, options);
      setNotice("Đã lưu giao dịch.");
      // Giữ lại loại giao dịch và tài khoản để nhập khoản tiếp theo cho nhanh.
      setForm((previous) => ({
        ...createInitialForm(),
        type: previous.type,
        fromAccountId: previous.fromAccountId,
      }));
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

  async function handleCreateCategory(input: {
    name: string;
    icon: string;
    type: CategoryType;
    parentId: string | null;
  }) {
    // Không catch ở đây — CategoryFormPanel tự bắt lỗi (ApiClientError) và hiển
    // thị inline, panel phải ở lại mở để user thấy lỗi và sửa.
    const category = await createCategory(input);
    setOptions((previous) =>
      previous
        ? { ...previous, categories: [...previous.categories, category] }
        : previous,
    );
    // Chỉ chọn sẵn khi danh mục vừa tạo đúng loại đang nhập.
    if (category.type === currentCategoryType()) {
      updateField("categoryId", category.id);
    }
    setOverlay({ kind: "none" });
  }

  async function handleCreateContact(name: string) {
    // Không catch ở đây — ContactCreateDialog tự bắt lỗi (ApiClientError) và
    // hiển thị inline, dialog phải ở lại mở để user thấy lỗi và sửa.
    const contact = await createContact(name);
    setOptions((previous) =>
      previous
        ? { ...previous, contacts: [...previous.contacts, contact] }
        : previous,
    );
    updateField("contactId", contact.id);
    setOverlay({ kind: "none" });
  }

  if (status === "loading") return <RecordSkeleton />;

  if (status === "error" || !options) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4">
        <FormAlert
          tone="error"
          message={loadError ?? "Không tải được dữ liệu tài khoản và danh mục."}
          onRetry={() => {
            setStatus("loading");
            setReloadToken((token) => token + 1);
          }}
        />
      </div>
    );
  }

  if (options.accounts.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6 text-center">
        <p className="text-base font-medium text-slate-800">
          Bạn chưa có tài khoản nào
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Tạo một tài khoản (tiền mặt, ngân hàng...) trước khi ghi giao dịch.
        </p>
        <Link
          href="/account"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Thêm tài khoản
        </Link>
      </div>
    );
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
      setOverlay({
        kind: "category-form" as const,
        type: currentCategoryType(),
      }),
    onSelectCategory: (categoryId: string) =>
      updateField("categoryId", categoryId),
    onOpenContact: () => setOverlay({ kind: "contact" }),
  };

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <RecordHeader
        type={form.type}
        onTypeChange={handleTypeChange}
        onHistory={() => setNotice(COMING_SOON)}
      />

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
        ) : form.type === "ADJUSTMENT" ? (
          <AdjustmentForm {...formProps} />
        ) : (
          <ExpenseIncomeForm {...formProps} />
        )}

        <SaveButton pending={pending} />
      </form>

      {overlay.kind === "account" ? (
        <AccountSheet
          title={overlay.target === "to" ? "Tài khoản đích" : "Select Account"}
          accounts={options.accounts}
          selectedId={
            overlay.target === "to" ? form.toAccountId : form.fromAccountId
          }
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
          // Adjustment không cho đổi tab (allowTypeSwitch=false) và category hợp
          // lệ đổi theo dấu chênh lệch, không phải tab đang chọn trong sheet.
          activeType={
            form.type === "ADJUSTMENT" ? currentCategoryType() : categorySheetType
          }
          onTypeChange={setCategorySheetType}
          allowTypeSwitch={form.type !== "ADJUSTMENT"}
          selectedId={form.categoryId}
          onSelect={(categoryId) => {
            updateField("categoryId", categoryId);
            setOverlay({ kind: "none" });
          }}
          onAddNew={() =>
            setOverlay({
              kind: "category-form",
              type: form.type === "ADJUSTMENT" ? currentCategoryType() : categorySheetType,
            })
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
    </div>
  );
}

function RecordSkeleton() {
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
