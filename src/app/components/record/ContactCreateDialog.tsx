"use client";

import { useEffect, useRef, useState } from "react";

interface ContactCreateDialogProps {
  /** Tên đã tồn tại, để chặn trùng (so sánh không phân biệt hoa thường). */
  existingNames: string[];
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void>;
}

const MAX_NAME_LENGTH = 50;

export default function ContactCreateDialog({
  existingNames,
  onCancel,
  onSubmit,
}: ContactCreateDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  async function submit() {
    const value = name.trim();
    if (!value) {
      setError("Vui lòng nhập tên người liên hệ.");
      return;
    }
    if (value.length > MAX_NAME_LENGTH) {
      setError(`Tên tối đa ${MAX_NAME_LENGTH} ký tự.`);
      return;
    }
    if (existingNames.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setError("Tên này đã tồn tại.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      await onSubmit(value);
    } catch {
      setError("Không tạo được contact. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onCancel}
        className="absolute inset-0 bg-slate-800/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tạo contact mới"
        className="relative w-full max-w-sm rounded-2xl bg-white p-4"
      >
        <h2 className="text-base font-medium text-slate-800">Tạo contact mới</h2>
        <label htmlFor="contact-name" className="sr-only">
          Tên người liên hệ
        </label>
        <input
          id="contact-name"
          ref={inputRef}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          disabled={pending}
          placeholder="Tên người liên hệ"
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submit();
            }
          }}
          aria-invalid={error ? true : undefined}
          className={`mt-3 min-h-11 w-full rounded-xl border px-3 py-2 text-sm text-slate-800 outline-none ${
            error ? "border-rose-600" : "border-slate-200 focus:border-emerald-600"
          }`}
        />
        {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}

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
            onClick={() => void submit()}
            disabled={pending}
            className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {pending ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
