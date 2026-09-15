"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_SHORT_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface MonthRangeModalProps {
  initialFrom: Date;
  initialTo: Date;
  onConfirm: (fromYear: number, fromMonth: number, toYear: number, toMonth: number) => void;
  onClose: () => void;
}

function monthIndexOf(year: number, month: number): number {
  return year * 12 + month;
}

/** Picker khoảng tháng — cùng khung dialog và cách chọn click-click như `RangeCalendarModal`,
 * chỉ khác lưới là 12 tháng của một năm thay vì lưới ngày. */
export default function MonthRangeModal({
  initialFrom,
  initialTo,
  onConfirm,
  onClose,
}: MonthRangeModalProps) {
  const [fromYear, setFromYear] = useState(initialFrom.getFullYear());
  const [fromMonth, setFromMonth] = useState(initialFrom.getMonth());
  const [toYear, setToYear] = useState(initialTo.getFullYear());
  const [toMonth, setToMonth] = useState(initialTo.getMonth());
  const [cursorYear, setCursorYear] = useState(initialFrom.getFullYear());
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

  function pickMonth(year: number, month: number) {
    const index = monthIndexOf(year, month);
    const fromIndex = monthIndexOf(fromYear, fromMonth);
    if (index < fromIndex) {
      setFromYear(year);
      setFromMonth(month);
      return;
    }
    setToYear(year);
    setToMonth(month);
  }

  function cellState(year: number, month: number): "from" | "to" | "in-range" | "none" {
    const index = monthIndexOf(year, month);
    const fromIndex = monthIndexOf(fromYear, fromMonth);
    const toIndex = monthIndexOf(toYear, toMonth);
    if (index === fromIndex) return "from";
    if (index === toIndex) return "to";
    if (index > fromIndex && index < toIndex) return "in-range";
    return "none";
  }

  function goToday() {
    const now = new Date();
    setFromYear(now.getFullYear());
    setFromMonth(now.getMonth());
    setToYear(now.getFullYear());
    setToMonth(now.getMonth());
    setCursorYear(now.getFullYear());
  }

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
        aria-label="Chọn khoảng tháng"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-2xl bg-white p-4 outline-none"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-500">
            {fromMonth + 1}/{fromYear}
            <span className="mx-1 text-slate-400">to</span>
            <span className="text-emerald-600">
              {toMonth + 1}/{toYear}
            </span>
          </p>
          <button
            type="button"
            onClick={() => onConfirm(fromYear, fromMonth, toYear, toMonth)}
            aria-label="Xác nhận"
            className="flex min-h-11 min-w-11 items-center justify-center text-emerald-600"
          >
            <Check size={20} aria-hidden />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCursorYear((year) => year - 1)}
            aria-label="Năm trước"
            className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
          >
            <ChevronLeft size={20} aria-hidden />
          </button>
          <span className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white">
            {cursorYear}
          </span>
          <button
            type="button"
            onClick={() => setCursorYear((year) => year + 1)}
            aria-label="Năm sau"
            className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
          >
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {MONTH_SHORT_NAMES.map((name, index) => {
            const state = cellState(cursorYear, index);
            return (
              <button
                key={name}
                type="button"
                onClick={() => pickMonth(cursorYear, index)}
                className={`min-h-11 rounded-xl text-sm ${
                  state === "from" || state === "to"
                    ? "bg-emerald-600 font-medium text-white"
                    : state === "in-range"
                      ? "bg-emerald-50 text-emerald-600"
                      : "text-slate-800 hover:bg-slate-100"
                }`}
              >
                {name}
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
            onClick={() => onConfirm(fromYear, fromMonth, toYear, toMonth)}
            className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
