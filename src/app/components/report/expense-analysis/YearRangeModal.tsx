"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

interface YearRangeModalProps {
  initialFromYear: number;
  initialToYear: number;
  onConfirm: (fromYear: number, toYear: number) => void;
  onClose: () => void;
}

const YEARS_PER_PAGE = 12;

function pageStartOf(year: number): number {
  return Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE;
}

/** Picker khoảng năm — cùng khung dialog và cách chọn click-click như `RangeCalendarModal`/
 * `MonthRangeModal`, lưới là các năm của một trang 12 năm, chevron lùi/tiến theo trang. */
export default function YearRangeModal({
  initialFromYear,
  initialToYear,
  onConfirm,
  onClose,
}: YearRangeModalProps) {
  const [fromYear, setFromYear] = useState(initialFromYear);
  const [toYear, setToYear] = useState(initialToYear);
  const [pageStartYear, setPageStartYear] = useState(pageStartOf(initialFromYear));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    panelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [onClose]);

  function pickYear(year: number) {
    if (year < fromYear) {
      setFromYear(year);
      return;
    }
    setToYear(year);
  }

  function cellState(year: number): "from" | "to" | "in-range" | "none" {
    if (year === fromYear) return "from";
    if (year === toYear) return "to";
    if (year > fromYear && year < toYear) return "in-range";
    return "none";
  }

  function goToday() {
    const year = new Date().getFullYear();
    setFromYear(year);
    setToYear(year);
    setPageStartYear(pageStartOf(year));
  }

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, index) => pageStartYear + index);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-slate-800/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Chọn khoảng năm"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-2xl bg-white p-4 outline-none"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-500">
            {fromYear}
            <span className="mx-1 text-slate-400">to</span>
            <span className="text-emerald-600">{toYear}</span>
          </p>
          <button
            type="button"
            onClick={() => onConfirm(fromYear, toYear)}
            aria-label="Xác nhận"
            className="flex min-h-11 min-w-11 items-center justify-center text-emerald-600"
          >
            <Check size={20} aria-hidden />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPageStartYear((year) => year - YEARS_PER_PAGE)}
            aria-label="Trang năm trước"
            className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
          >
            <ChevronLeft size={20} aria-hidden />
          </button>
          <span className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white">
            {pageStartYear} - {pageStartYear + YEARS_PER_PAGE - 1}
          </span>
          <button
            type="button"
            onClick={() => setPageStartYear((year) => year + YEARS_PER_PAGE)}
            aria-label="Trang năm sau"
            className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
          >
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {years.map((year) => {
            const state = cellState(year);
            return (
              <button
                key={year}
                type="button"
                onClick={() => pickYear(year)}
                className={`min-h-11 rounded-xl text-sm ${
                  state === "from" || state === "to"
                    ? "bg-emerald-600 font-medium text-white"
                    : state === "in-range"
                      ? "bg-emerald-50 text-emerald-600"
                      : "text-slate-800 hover:bg-slate-100"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={goToday}
            className="min-h-11 flex-1 rounded-xl border border-emerald-600 px-4 text-sm font-medium text-emerald-600"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onConfirm(fromYear, toYear)}
            className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
