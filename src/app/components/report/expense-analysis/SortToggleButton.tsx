"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import type { SortType } from "@/lib/expense-analysis-client";

interface SortToggleButtonProps {
  value: SortType;
  onToggle: () => void;
}

export default function SortToggleButton({ value, onToggle }: SortToggleButtonProps) {
  const isAsc = value === "asc";
  const Icon = isAsc ? ArrowUpNarrowWide : ArrowDownWideNarrow;
  const label = isAsc ? "Tăng dần" : "Giảm dần";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Sắp xếp theo số tiền: ${label}. Bấm để đổi chiều`}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
