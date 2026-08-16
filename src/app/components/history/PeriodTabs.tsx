"use client";

import type { PeriodKind } from "@/lib/period";

interface PeriodTab {
  value: PeriodKind;
  label: string;
}

const TABS: PeriodTab[] = [
  { value: "date", label: "Date" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "custom", label: "Custom" },
];

interface PeriodTabsProps {
  active: PeriodKind;
  onChange: (tab: PeriodKind) => void;
}

export default function PeriodTabs({ active, onChange }: PeriodTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Loại kỳ"
      className="flex overflow-x-auto border-b border-slate-200 bg-white px-2"
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
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium ${
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
