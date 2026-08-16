"use client";

import { useEffect } from "react";
import { RECORD_TYPES, type RecordType } from "@/lib/record-types";

interface TransactionTypeMenuProps {
  value: RecordType;
  onSelect: (type: RecordType) => void;
  onClose: () => void;
}

export default function TransactionTypeMenu({
  value,
  onSelect,
  onClose,
}: TransactionTypeMenuProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Đóng danh sách loại giao dịch"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-slate-800/20"
      />
      <ul
        role="listbox"
        aria-label="Loại giao dịch"
        className="absolute left-1/2 top-full z-40 mt-2 w-48 -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
      >
        {RECORD_TYPES.map((item) => {
          const selected = item.value === value;
          return (
            <li key={item.value}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(item.value)}
                className={`flex min-h-11 w-full items-center px-4 py-2 text-left text-sm ${
                  selected
                    ? `font-medium ${item.textClass}`
                    : "text-slate-800 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
