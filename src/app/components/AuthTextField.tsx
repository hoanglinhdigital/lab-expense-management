"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AuthTextFieldProps {
  id: string;
  name: string;
  /** Nhãn cho screen reader — mockup chỉ hiển thị placeholder. */
  label: string;
  placeholder: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  error?: string;
  disabled?: boolean;
  /** Cho phép bật/tắt hiển thị mật khẩu. Chỉ dùng với `type="password"`. */
  revealable?: boolean;
}

export default function AuthTextField({
  id,
  name,
  label,
  placeholder,
  icon: Icon,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
  disabled = false,
  revealable = false,
}: AuthTextFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const inputType = revealable && revealed ? "text" : type;
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={`flex min-h-14 items-center gap-3 rounded-2xl border bg-slate-50 px-4 transition-colors focus-within:border-emerald-600 ${
          error ? "border-rose-600" : "border-slate-200"
        }`}
      >
        <Icon size={20} className="shrink-0 text-slate-500" aria-hidden />
        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
        />
        {revealable ? (
          <button
            type="button"
            onClick={() => setRevealed((previous) => !previous)}
            aria-label={revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="-mr-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center text-slate-500"
          >
            {revealed ? (
              <EyeOff size={20} aria-hidden />
            ) : (
              <Eye size={20} aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="mt-1 px-1 text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
