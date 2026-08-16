"use client";

import { useState } from "react";
import { ChevronDown, History } from "lucide-react";
import TransactionTypeMenu from "./TransactionTypeMenu";
import { getRecordTypeConfig, type RecordType } from "@/lib/record-types";

interface RecordHeaderProps {
  type: RecordType;
  onTypeChange: (type: RecordType) => void;
  onHistory: () => void;
}

export default function RecordHeader({
  type,
  onTypeChange,
  onHistory,
}: RecordHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const config = getRecordTypeConfig(type);

  return (
    <header className="relative flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onHistory}
        aria-label="Lịch sử giao dịch"
        className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
      >
        <History size={24} aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        className={`flex min-h-11 items-center gap-2 rounded-full border-2 bg-white px-5 py-2 text-base font-medium ${config.borderClass} ${config.textClass}`}
      >
        {config.label}
        <ChevronDown size={16} aria-hidden />
      </button>

      {/* Giữ chỗ cân bằng với nút History để nút chọn loại nằm đúng giữa. */}
      <span className="size-11 shrink-0" aria-hidden />

      {menuOpen ? (
        <TransactionTypeMenu
          value={type}
          onSelect={(next) => {
            onTypeChange(next);
            setMenuOpen(false);
          }}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
    </header>
  );
}
