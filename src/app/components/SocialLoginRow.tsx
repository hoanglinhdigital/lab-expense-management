"use client";

import type { ReactNode } from "react";

export type SocialProvider = "google" | "facebook" | "apple";

interface SocialLoginRowProps {
  onSelect: (provider: SocialProvider) => void;
  disabled?: boolean;
}

/**
 * Logo thương hiệu là tài sản của bên thứ ba, `lucide-react` không cung cấp —
 * đây là ngoại lệ có chủ đích so với quy tắc "icon giao diện dùng lucide".
 * Mọi icon chức năng khác trong màn hình auth vẫn lấy từ lucide.
 */
const PROVIDERS: {
  id: SocialProvider;
  label: string;
  mark: ReactNode;
}[] = [
  {
    id: "google",
    label: "Đăng nhập với Google",
    mark: (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
        />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Đăng nhập với Facebook",
    mark: (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path
          fill="#1877F2"
          d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12Z"
        />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Đăng nhập với Apple",
    mark: (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path
          fill="#000000"
          d="M17 12.5c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.6-1.9-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.8-1.7 0-3.2 1-4 2.5-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4a10 10 0 0 0 1.4-2.8c-.1 0-2.6-1-2.6-4.1ZM14.7 4.7c.7-.8 1.1-1.9 1-3-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.5Z"
        />
      </svg>
    ),
  },
];

export default function SocialLoginRow({
  onSelect,
  disabled = false,
}: SocialLoginRowProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-500">Hoặc login với</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-4">
        {PROVIDERS.map(({ id, label, mark }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            disabled={disabled}
            aria-label={label}
            className="flex size-12 items-center justify-center rounded-full border border-slate-200 bg-white transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {mark}
          </button>
        ))}
      </div>
    </div>
  );
}
