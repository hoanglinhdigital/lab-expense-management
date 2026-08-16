"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Sheet trượt từ đáy trên mobile, chuyển thành dialog canh giữa từ `md:`.
 * Component chỉ được mount khi đang mở — nơi gọi tự quản lý trạng thái đóng/mở.
 */
export default function BottomSheet({
  title,
  onClose,
  children,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-slate-800/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-white outline-none md:max-w-md md:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-medium text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  );
}
