"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import FormAlert from "../FormAlert";
import AccountFormPanel from "./AccountFormPanel";
import AccountGroupCard from "./AccountGroupCard";
import AccountHeader from "./AccountHeader";
import AccountSkeleton from "./AccountSkeleton";
import { createAccount, fetchAccountOverview } from "@/lib/account-client";
import { amountToNumber } from "@/lib/format";
import type { AccountFormState, AccountOverview } from "@/lib/account-types";

const COMING_SOON = "Tính năng đang phát triển, vui lòng quay lại sau.";
const LOAD_ERROR = "Không tải được danh sách tài khoản.";

export default function AccountScreen() {
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  /** Tăng lên mỗi lần bấm "Thử lại" hoặc sau khi tạo tài khoản, để chạy lại effect. */
  const [reloadToken, setReloadToken] = useState(0);

  // setState chỉ nằm trong callback của promise, không gọi đồng bộ trong thân
  // effect — tránh cascading render (rule `react-hooks/set-state-in-effect`).
  useEffect(() => {
    let cancelled = false;
    fetchAccountOverview().then(
      (result) => {
        if (cancelled) return;
        setOverview(result);
        setError(null);
      },
      () => {
        if (!cancelled) setError(LOAD_ERROR);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  function reload() {
    setError(null);
    setReloadToken((token) => token + 1);
  }

  async function handleCreate(form: AccountFormState) {
    await createAccount({
      name: form.name,
      kind: form.kind,
      currency: form.currency,
      balance: amountToNumber(form.balance),
      description: form.description.trim(),
    });
    setFormOpen(false);
    setNotice(`Đã tạo tài khoản ${form.name}.`);
    reload();
  }

  if (!overview) {
    if (error) {
      return (
        <div className="mx-auto w-full max-w-2xl p-4">
          <FormAlert tone="error" message={error} onRetry={reload} />
        </div>
      );
    }
    return <AccountSkeleton />;
  }

  const isEmpty = overview.groups.every((group) => group.accounts.length === 0);

  return (
    <div className="min-h-dvh bg-slate-50">
      <AccountHeader
        totalBalance={overview.totalBalance}
        currency={overview.currency}
        hidden={balanceHidden}
        onToggle={() => setBalanceHidden((previous) => !previous)}
        onAdd={() => setFormOpen(true)}
      />

      <div className="mx-auto -mt-6 flex w-full max-w-2xl flex-col gap-4 p-4">
        {error ? <FormAlert tone="error" message={error} onRetry={reload} /> : null}
        {notice ? <FormAlert tone="info" message={notice} /> : null}

        {isEmpty ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-base font-medium text-slate-800">
              Bạn chưa có tài khoản nào
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Tạo tài khoản đầu tiên (tiền mặt, ngân hàng...) để bắt đầu ghi chi tiêu.
            </p>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus size={16} aria-hidden />
              Thêm tài khoản
            </button>
          </div>
        ) : (
          overview.groups.map((group) => (
            <AccountGroupCard
              key={group.id}
              group={group}
              hidden={balanceHidden}
              onMenu={() => setNotice(COMING_SOON)}
            />
          ))
        )}
      </div>

      {formOpen ? (
        <AccountFormPanel
          existingNames={overview.groups.flatMap((group) =>
            group.accounts.map((account) => account.name),
          )}
          onBack={() => setFormOpen(false)}
          onSubmit={handleCreate}
        />
      ) : null}
    </div>
  );
}
