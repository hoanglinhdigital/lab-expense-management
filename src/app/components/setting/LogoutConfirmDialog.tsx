"use client";

import { useEffect, useRef, useState } from "react";

interface LogoutConfirmDialogProps {
  onCancel: () => void;
  /** Ném lỗi nếu đăng xuất thất bại — dialog tự hiển thị lỗi và cho bấm lại. */
  onConfirm: () => Promise<void>;
}

export default function LogoutConfirmDialog({
  onCancel,
  onConfirm,
}: LogoutConfirmDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    confirmRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [onCancel]);

  async function confirm() {
    setError(null);
    setPending(true);
    try {
      await onConfirm();
    } catch {
      setError("Không đăng xuất được. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onCancel}
        className="absolute inset-0 bg-slate-800/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Đăng xuất"
        className="relative w-full max-w-sm rounded-2xl bg-white p-4"
      >
        <h2 className="text-base font-medium text-slate-800">Đăng xuất</h2>
        <p className="mt-2 text-sm text-slate-500">
          Bạn có chắc muốn đăng xuất khỏi tài khoản này?
        </p>
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-800"
          >
            Hủy
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={() => void confirm()}
            disabled={pending}
            className="min-h-11 flex-1 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {pending ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      </div>
    </div>
  );
}
