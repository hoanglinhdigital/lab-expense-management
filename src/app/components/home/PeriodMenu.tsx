"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PERIOD_OPTIONS, type PeriodRange } from "@/lib/home-types";

interface PeriodMenuProps {
  value: PeriodRange;
  /** Nhãn hiển thị trên nút, ví dụ "01/2026 – 08/2026". */
  label: string;
  onChange: (range: PeriodRange) => void;
}

export default function PeriodMenu({ value, label, onChange }: PeriodMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm tabular-nums text-slate-800 hover:bg-slate-50"
      >
        {label}
        <ChevronDown size={16} aria-hidden />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Đóng danh sách khoảng thời gian"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-slate-800/20"
          />
          <ul
            role="listbox"
            aria-label="Khoảng thời gian"
            className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
          >
            {PERIOD_OPTIONS.map((option) => {
              const selected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex min-h-11 w-full items-center px-4 py-2 text-left text-sm ${
                      selected
                        ? "font-medium text-emerald-600"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
