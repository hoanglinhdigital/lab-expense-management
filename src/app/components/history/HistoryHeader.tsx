"use client";

import { ArrowLeft, EllipsisVertical, Search } from "lucide-react";

interface HistoryHeaderProps {
  onBack: () => void;
  /** Search và menu chưa có màn đích trong mockup — hiện notice "đang phát triển". */
  onPlaceholder: () => void;
}

export default function HistoryHeader({ onBack, onPlaceholder }: HistoryHeaderProps) {
  return (
    <header className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Quay lại"
        className="flex min-h-11 min-w-11 items-center justify-center text-slate-800"
      >
        <ArrowLeft size={24} aria-hidden />
      </button>

      <h1 className="flex-1 text-center text-lg font-semibold text-slate-800">
        Transaction history
      </h1>

      <button
        type="button"
        onClick={onPlaceholder}
        aria-label="Tìm kiếm giao dịch"
        className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
      >
        <Search size={20} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onPlaceholder}
        aria-label="Thêm tuỳ chọn"
        className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
      >
        <EllipsisVertical size={20} aria-hidden />
      </button>
    </header>
  );
}
