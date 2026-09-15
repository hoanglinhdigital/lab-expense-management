"use client";

import { useState } from "react";
import RangeCalendarModal from "../../history/RangeCalendarModal";
import MonthRangeModal from "./MonthRangeModal";
import YearRangeModal from "./YearRangeModal";
import { dayPeriod, monthPeriod, yearPeriod } from "@/lib/expense-analysis-types";
import type { AnalysisPeriod } from "@/lib/expense-analysis-types";

interface PeriodRangeLabelProps {
  period: AnalysisPeriod;
  onChange: (period: AnalysisPeriod) => void;
}

/** Nút nhãn kỳ (vd "9/2026") — bấm mở đúng picker theo `period.granularity` hiện tại. */
export default function PeriodRangeLabel({ period, onChange }: PeriodRangeLabelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex justify-center border-b border-slate-200 bg-white py-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-11 rounded-full px-4 text-base font-semibold text-slate-800 hover:bg-slate-50"
        >
          {period.label}
        </button>
      </div>

      {open && period.granularity === "DAY" ? (
        <RangeCalendarModal
          initialFrom={period.from}
          initialTo={period.to}
          onClose={() => setOpen(false)}
          onConfirm={(from, to) => {
            onChange(dayPeriod(from, to));
            setOpen(false);
          }}
        />
      ) : null}

      {open && period.granularity === "MONTH" ? (
        <MonthRangeModal
          initialFrom={period.from}
          initialTo={period.to}
          onClose={() => setOpen(false)}
          onConfirm={(fromYear, fromMonth, toYear, toMonth) => {
            onChange(monthPeriod(fromYear, fromMonth, toYear, toMonth));
            setOpen(false);
          }}
        />
      ) : null}

      {open && period.granularity === "YEAR" ? (
        <YearRangeModal
          initialFromYear={period.from.getFullYear()}
          initialToYear={period.to.getFullYear()}
          onClose={() => setOpen(false)}
          onConfirm={(fromYear, toYear) => {
            onChange(yearPeriod(fromYear, toYear));
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
