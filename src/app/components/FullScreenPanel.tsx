"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

interface FullScreenPanelProps {
  title: string;
  onBack: () => void;
  /** Nút phụ bên phải header (ví dụ nút xác nhận ✓ của màn Add Account). */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Overlay chiếm trọn màn hình, có header "quay lại" — dùng cho các màn phụ
 * nhiều nội dung (thêm category, chọn parent category, chọn icon).
 */
export default function FullScreenPanel({
  title,
  onBack,
  action,
  children,
}: FullScreenPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onBack();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [onBack]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-slate-50 outline-none"
    >
      <header className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại"
          className="flex min-h-11 min-w-11 items-center justify-center text-slate-800"
        >
          <ChevronLeft size={24} aria-hidden />
        </button>
        <h2 className="flex-1 text-base font-medium text-slate-800">{title}</h2>
        {action}
      </header>
      <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
