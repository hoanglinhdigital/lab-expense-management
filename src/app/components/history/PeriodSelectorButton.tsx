"use client";

import { ChevronRight } from "lucide-react";

interface PeriodSelectorButtonProps {
  label: string;
  onClick: () => void;
}

export default function PeriodSelectorButton({
  label,
  onClick,
}: PeriodSelectorButtonProps) {
  return (
    <div className="flex justify-center border-b border-slate-200 bg-white py-2">
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-11 items-center gap-1 text-sm font-medium text-emerald-600"
      >
        {label}
        <ChevronRight size={16} aria-hidden />
      </button>
    </div>
  );
}
