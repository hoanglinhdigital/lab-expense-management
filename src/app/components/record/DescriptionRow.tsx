"use client";

import { AlignLeft } from "lucide-react";

interface DescriptionRowProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export default function DescriptionRow({
  id,
  value,
  onChange,
}: DescriptionRowProps) {
  return (
    <div className="flex items-center gap-2">
      <AlignLeft size={16} className="shrink-0 text-slate-500" aria-hidden />
      <label htmlFor={id} className="sr-only">
        Ghi chú
      </label>
      <input
        id={id}
        value={value}
        maxLength={200}
        placeholder="Description"
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600"
      />
    </div>
  );
}
