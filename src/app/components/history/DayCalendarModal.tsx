"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildCalendarGrid, formatDayLabel, isSameDay } from "@/lib/period";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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

interface DayCalendarModalProps {
  /** "day": lưới ngày trong tháng. "month": lưới 12 tháng trong năm. */
  mode?: "day" | "month";
  initialDate: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

export default function DayCalendarModal({
  mode = "day",
  initialDate,
  onConfirm,
  onClose,
}: DayCalendarModalProps) {
  const [selected, setSelected] = useState(initialDate);
  const [cursorYear, setCursorYear] = useState(initialDate.getFullYear());
  const [cursorMonth, setCursorMonth] = useState(initialDate.getMonth());
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

  function goToday() {
    const today = new Date();
    setSelected(today);
    setCursorYear(today.getFullYear());
    setCursorMonth(today.getMonth());
  }

  function shiftMonth(delta: number) {
    const next = new Date(cursorYear, cursorMonth + delta, 1);
    setCursorYear(next.getFullYear());
    setCursorMonth(next.getMonth());
  }

  function shiftYear(delta: number) {
    setCursorYear((year) => year + delta);
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
        aria-label="Chọn ngày"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-2xl bg-white p-4 outline-none"
      >
        <p className="text-sm font-medium text-emerald-600">
          {formatDayLabel(selected)}
        </p>

        {mode === "day" ? (
          <>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Tháng trước"
                className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
              >
                <ChevronLeft size={20} aria-hidden />
              </button>
              <span className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white">
                {MONTH_SHORT_NAMES[cursorMonth]}/{cursorYear}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Tháng sau"
                className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
              >
                <ChevronRight size={20} aria-hidden />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
              {WEEKDAY_HEADERS.map((day) => (
                <span key={day} className="text-xs text-slate-500">
                  {day}
                </span>
              ))}
              {buildCalendarGrid(cursorYear, cursorMonth).map((cell) => {
                const isSelected = isSameDay(cell.date, selected);
                return (
                  <button
                    key={cell.date.toISOString()}
                    type="button"
                    disabled={!cell.inMonth}
                    onClick={() => setSelected(cell.date)}
                    className={`mx-auto flex size-9 items-center justify-center rounded-full text-sm ${
                      isSelected
                        ? "bg-emerald-600 font-medium text-white"
                        : cell.inMonth
                          ? "text-slate-800 hover:bg-slate-100"
                          : "text-slate-300"
                    }`}
                  >
                    {cell.date.getDate()}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftYear(-1)}
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
                onClick={() => shiftYear(1)}
                aria-label="Năm sau"
                className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
              >
                <ChevronRight size={20} aria-hidden />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {MONTH_SHORT_NAMES.map((name, index) => {
                const isSelected =
                  selected.getFullYear() === cursorYear && selected.getMonth() === index;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelected(new Date(cursorYear, index, 1))}
                    className={`min-h-11 rounded-xl text-sm ${
                      isSelected
                        ? "bg-emerald-600 font-medium text-white"
                        : "text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </>
        )}

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
            onClick={() => onConfirm(selected)}
            className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
