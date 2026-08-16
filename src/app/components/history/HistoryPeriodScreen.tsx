"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import PeriodTabs from "./PeriodTabs";
import PeriodOptionRow from "./PeriodOptionRow";
import DayCalendarModal from "./DayCalendarModal";
import RangeCalendarModal from "./RangeCalendarModal";
import { rangeFromSearchParams, rangeToQuery } from "@/lib/history-types";
import {
  allTimeRange,
  customRange,
  dayRange,
  formatDayLabel,
  lastMonthRange,
  lastWeekRange,
  monthRange,
  quarterRange,
  thisMonthRange,
  thisWeekRange,
  todayRange,
  weekRangeContaining,
  yesterdayRange,
  type PeriodKind,
  type PeriodRange,
} from "@/lib/period";

type DayModalContext = "date" | "week" | "month";

const QUARTER_LABELS = ["Quarter I", "Quarter II", "Quarter III", "Quarter IV"];

export default function HistoryPeriodScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = rangeFromSearchParams(searchParams);

  const [activeTab, setActiveTab] = useState<PeriodKind>(current.kind);
  const [dayModal, setDayModal] = useState<DayModalContext | null>(null);
  const [rangeModalOpen, setRangeModalOpen] = useState(false);

  const now = new Date();

  function apply(range: PeriodRange) {
    const query = new URLSearchParams(rangeToQuery(range)).toString();
    router.replace(`/history?${query}`);
  }

  const modalInitialDate = current.from ?? now;
  const fromLabel = current.kind === "custom" && current.from
    ? formatDayLabel(current.from)
    : formatDayLabel(now);
  const toLabel = current.kind === "custom" && current.to
    ? formatDayLabel(current.to)
    : formatDayLabel(now);

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Quay lại"
          className="flex min-h-11 min-w-11 items-center justify-center text-slate-800"
        >
          <ArrowLeft size={24} aria-hidden />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-slate-800">
          Data setting
        </h1>
        <span className="size-11 shrink-0" aria-hidden />
      </header>

      <PeriodTabs active={activeTab} onChange={setActiveTab} />

      <div className="mx-auto w-full max-w-2xl bg-white">
        {activeTab === "date" ? (
          <>
            <PeriodOptionRow
              label="Yesterday"
              selected={current.kind === "date" && current.label === "Yesterday"}
              onClick={() => apply(yesterdayRange())}
            />
            <PeriodOptionRow
              label="Today"
              selected={current.kind === "date" && current.label === "Today"}
              onClick={() => apply(todayRange())}
            />
            <PeriodOptionRow
              label="Select day"
              selected={
                current.kind === "date" &&
                current.label !== "Today" &&
                current.label !== "Yesterday"
              }
              onClick={() => setDayModal("date")}
            />
          </>
        ) : null}

        {activeTab === "week" ? (
          <>
            <PeriodOptionRow
              label="Last week"
              selected={current.kind === "week" && current.label === "Last week"}
              onClick={() => apply(lastWeekRange())}
            />
            <PeriodOptionRow
              label="This week"
              selected={current.kind === "week" && current.label === "This week"}
              onClick={() => apply(thisWeekRange())}
            />
            <PeriodOptionRow
              label="Select week"
              selected={
                current.kind === "week" &&
                current.label !== "This week" &&
                current.label !== "Last week"
              }
              onClick={() => setDayModal("week")}
            />
          </>
        ) : null}

        {activeTab === "month" ? (
          <>
            <PeriodOptionRow
              label="This month"
              selected={current.kind === "month" && current.label === "This month"}
              onClick={() => apply(thisMonthRange())}
            />
            <PeriodOptionRow
              label="Last month"
              selected={current.kind === "month" && current.label === "Last month"}
              onClick={() => apply(lastMonthRange())}
            />
            <PeriodOptionRow
              label="Select month"
              selected={
                current.kind === "month" &&
                current.label !== "This month" &&
                current.label !== "Last month"
              }
              onClick={() => setDayModal("month")}
            />
          </>
        ) : null}

        {activeTab === "quarter" ? (
          <>
            {QUARTER_LABELS.map((label, index) => (
              <PeriodOptionRow
                key={label}
                label={label}
                selected={current.kind === "quarter" && current.label === label}
                onClick={() => apply(quarterRange(now.getFullYear(), index + 1))}
              />
            ))}
          </>
        ) : null}

        {activeTab === "custom" ? (
          <>
            <PeriodOptionRow
              label="All time"
              selected={current.kind === "custom" && current.from === null}
              onClick={() => apply(allTimeRange())}
            />
            <div className="px-4 py-3">
              <p className="text-sm text-slate-800">Custom</p>
              <button
                type="button"
                onClick={() => setRangeModalOpen(true)}
                className="mt-2 flex min-h-11 w-full items-center gap-2 text-sm"
              >
                <span className="w-10 shrink-0 text-slate-500">From</span>
                <span className="text-emerald-600">{fromLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => setRangeModalOpen(true)}
                className="flex min-h-11 w-full items-center gap-2 text-sm"
              >
                <span className="w-10 shrink-0 text-slate-500">To</span>
                <span className="text-emerald-600">{toLabel}</span>
              </button>
            </div>
          </>
        ) : null}
      </div>

      {dayModal ? (
        <DayCalendarModal
          mode={dayModal === "month" ? "month" : "day"}
          initialDate={modalInitialDate}
          onClose={() => setDayModal(null)}
          onConfirm={(date) => {
            if (dayModal === "date") apply(dayRange(date));
            else if (dayModal === "week") apply(weekRangeContaining(date));
            else apply(monthRange(date.getFullYear(), date.getMonth()));
            setDayModal(null);
          }}
        />
      ) : null}

      {rangeModalOpen ? (
        <RangeCalendarModal
          initialFrom={current.from ?? now}
          initialTo={current.to ?? now}
          onClose={() => setRangeModalOpen(false)}
          onConfirm={(from, to) => {
            apply(customRange(from, to));
            setRangeModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
