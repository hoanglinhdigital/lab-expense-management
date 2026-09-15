/**
 * Kỳ báo cáo cho màn Expense Analysis (tab Report) — 3 chế độ Day/Month/Year,
 * mỗi chế độ chọn một khoảng (from-to). Lưu ở query string của URL
 * (`type`/`from`/`to`) để giữ lựa chọn khi điều hướng giữa màn chính và màn chi
 * tiết, giống cách `history-types.ts` làm với `PeriodRange`.
 */

import { customRange, formatDayLabel, monthSpanRange, yearSpanRange } from "./period";

export type PeriodGranularity = "DAY" | "MONTH" | "YEAR";

export interface AnalysisPeriod {
  granularity: PeriodGranularity;
  from: Date;
  to: Date;
  /** Nhãn hiển thị cạnh 3 tab, vd "9/2026", "1/2026 - 9/2026", "2022-2026". */
  label: string;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayPeriod(from: Date, to: Date): AnalysisPeriod {
  const range = customRange(from, to);
  const label = isSameCalendarDay(from, to) ? formatDayLabel(from) : range.label;
  // `customRange` luôn trả `from`/`to` khác null.
  return { granularity: "DAY", from: range.from as Date, to: range.to as Date, label };
}

/** `monthIndex`: 0 = January .. 11 = December. */
export function monthPeriod(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number,
): AnalysisPeriod {
  const range = monthSpanRange(fromYear, fromMonth, toYear, toMonth);
  return { granularity: "MONTH", ...range };
}

export function yearPeriod(fromYear: number, toYear: number): AnalysisPeriod {
  const range = yearSpanRange(fromYear, toYear);
  return { granularity: "YEAR", ...range };
}

/** Kỳ mặc định của một tab khi chưa từng chọn gì ở tab đó trong phiên xem. */
export function defaultPeriodFor(
  granularity: PeriodGranularity,
  now: Date = new Date(),
): AnalysisPeriod {
  if (granularity === "DAY") return dayPeriod(now, now);
  if (granularity === "YEAR") return yearPeriod(now.getFullYear(), now.getFullYear());
  return monthPeriod(now.getFullYear(), now.getMonth(), now.getFullYear(), now.getMonth());
}

/** Mặc định của toàn màn khi vào lần đầu (không có query string): Month, tháng hiện tại. */
export function defaultPeriod(now: Date = new Date()): AnalysisPeriod {
  return defaultPeriodFor("MONTH", now);
}

export function periodToQuery(period: AnalysisPeriod): Record<string, string> {
  return {
    type: period.granularity,
    from: period.from.toISOString(),
    to: period.to.toISOString(),
  };
}

/** Đọc lại `AnalysisPeriod` từ `URLSearchParams`; thiếu/hỏng dữ liệu thì fallback mặc định. */
export function periodFromSearchParams(params: URLSearchParams): AnalysisPeriod {
  const type = params.get("type");
  const fromRaw = params.get("from");
  const toRaw = params.get("to");
  if (!type || !fromRaw || !toRaw) return defaultPeriod();

  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return defaultPeriod();

  if (type === "DAY") return dayPeriod(from, to);
  if (type === "YEAR") return yearPeriod(from.getFullYear(), to.getFullYear());
  if (type === "MONTH") {
    return monthPeriod(from.getFullYear(), from.getMonth(), to.getFullYear(), to.getMonth());
  }
  return defaultPeriod();
}
