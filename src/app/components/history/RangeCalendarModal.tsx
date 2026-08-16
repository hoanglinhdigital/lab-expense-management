"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { buildCalendarGrid, formatDayLabel, startOfDay } from "@/lib/period";

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

interface RangeCalendarModalProps {
  initialFrom: Date;
  initialTo: Date;
  onConfirm: (from: Date, to: Date) => void;
  onClose: () => void;
}

export default function RangeCalendarModal({
  initialFrom,
  initialTo,
  onConfirm,
  onClose,
}: RangeCalendarModalProps) {
  const [from, setFrom] = useState(startOfDay(initialFrom));
  const [to, setTo] = useState(startOfDay(initialTo));
  const [cursorYear, setCursorYear] = useState(initialFrom.getFullYear());
  const [cursorMonth, setCursorMonth] = useState(initialFrom.getMonth());
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

  function shiftMonth(delta: number) {
    const next = new Date(cursorYear, cursorMonth + delta, 1);
    setCursorYear(next.getFullYear());
    setCursorMonth(next.getMonth());
  }

  function pickDate(date: Date) {
    if (date < from) {
      setFrom(date);
      return;
    }
    if (date.getTime() === from.getTime()) {
      setTo(date);
      return;
    }
    setTo(date);
  }

  function cellState(date: Date): "from" | "to" | "in-range" | "none" {
    if (date.getTime() === from.getTime()) return "from";
    if (date.getTime() === to.getTime()) return "to";
    if (date > from && date < to) return "in-range";
    return "none";
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
        aria-label="Chọn khoảng ngày"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-2xl bg-white p-4 outline-none"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-500">
            {formatDayLabel(from)}
            <span className="mx-1 text-slate-400">to</span>
            <span className="text-emerald-600">{formatDayLabel(to)}</span>
          </p>
          <button
            type="button"
            onClick={() => onConfirm(from, to)}
            aria-label="Xác nhận"
            className="flex min-h-11 min-w-11 items-center justify-center text-emerald-600"
          >
            <Check size={20} aria-hidden />
          </button>
        </div>

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
            const state = cellState(cell.date);
            return (
              <button
                key={cell.date.toISOString()}
                type="button"
                disabled={!cell.inMonth}
                onClick={() => pickDate(cell.date)}
                className={`mx-auto flex size-9 items-center justify-center rounded-full text-sm ${
                  state === "from" || state === "to"
                    ? "bg-emerald-600 font-medium text-white"
                    : state === "in-range"
                      ? "bg-emerald-50 text-emerald-600"
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

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              const today = startOfDay(new Date());
              setFrom(today);
              setTo(today);
              setCursorYear(today.getFullYear());
              setCursorMonth(today.getMonth());
            }}
            className="min-h-11 flex-1 rounded-xl border border-emerald-600 px-4 text-sm font-medium text-emerald-600"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onConfirm(from, to)}
            className="min-h-11 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
