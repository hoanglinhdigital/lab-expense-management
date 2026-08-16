"use client";

import { Calendar, Clock } from "lucide-react";
import { formatDateLabel } from "@/lib/format";

interface DateTimeRowProps {
  /** "yyyy-MM-dd" */
  date: string;
  /** "HH:mm" */
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

export default function DateTimeRow({
  date,
  time,
  onDateChange,
  onTimeChange,
}: DateTimeRowProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
        <Calendar size={16} className="shrink-0 text-slate-500" aria-hidden />
        <span className="sr-only">Ngày giao dịch</span>
        {/* Ngày hiển thị dạng "Today 16/08/2026", input gốc trong suốt nằm đè lên
            để vẫn dùng được date picker sẵn có của trình duyệt. */}
        <span className="relative flex-1 text-sm text-slate-800">
          {formatDateLabel(date)}
          <input
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            className="absolute inset-0 h-full w-full opacity-0"
          />
        </span>
      </label>

      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
        <Clock size={16} className="shrink-0 text-slate-500" aria-hidden />
        <span className="sr-only">Giờ giao dịch</span>
        <input
          type="time"
          value={time}
          onChange={(event) => onTimeChange(event.target.value)}
          // Đủ rộng cho cả locale 12 giờ (kèm AM/PM) lẫn 24 giờ.
          className="w-24 bg-transparent text-sm tabular-nums text-slate-800 outline-none"
        />
      </label>
    </div>
  );
}
