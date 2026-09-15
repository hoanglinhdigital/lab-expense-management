"use client";

import type { PeriodGranularity } from "@/lib/expense-analysis-types";

interface PeriodTypeTabsProps {
  active: PeriodGranularity;
  onChange: (value: PeriodGranularity) => void;
}

const TABS: { value: PeriodGranularity; label: string }[] = [
  { value: "DAY", label: "Day" },
  { value: "MONTH", label: "Month" },
  { value: "YEAR", label: "Year" },
];

export default function PeriodTypeTabs({ active, onChange }: PeriodTypeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Kiểu kỳ báo cáo"
      className="flex gap-1 border-b border-slate-200 bg-white px-2"
    >
      {TABS.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={`min-h-11 flex-1 border-b-2 text-sm font-medium ${
              isActive
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
