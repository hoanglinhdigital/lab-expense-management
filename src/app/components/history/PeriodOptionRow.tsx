"use client";

import { Check } from "lucide-react";

interface PeriodOptionRowProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export default function PeriodOptionRow({
  label,
  selected,
  onClick,
}: PeriodOptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm ${
        selected ? "bg-emerald-50 font-medium text-emerald-600" : "text-slate-800"
      }`}
    >
      {label}
      {selected ? <Check size={16} className="text-emerald-600" aria-hidden /> : null}
    </button>
  );
}
