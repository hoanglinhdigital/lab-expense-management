"use client";

import { PERIOD_TABS, type PeriodTab } from "@/lib/report-types";

interface FlowPeriodTabsProps {
  active: PeriodTab;
  onChange: (tab: PeriodTab) => void;
}

export default function FlowPeriodTabs({
  active,
  onChange,
}: FlowPeriodTabsProps) {
  return (
    // 5 tab không đủ chỗ ở 375px nên cho cuộn ngang riêng hàng tab.
    <div
      role="tablist"
      aria-label="Kỳ báo cáo"
      className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2"
    >
      {PERIOD_TABS.map((tab) => {
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
