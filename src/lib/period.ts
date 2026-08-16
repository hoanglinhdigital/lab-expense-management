/**
 * Hàm thuần tính khoảng ngày (kỳ) dùng cho màn History + Data setting.
 * Mọi range đều theo giờ địa phương của trình duyệt, quy về mốc đầu ngày
 * (00:00:00.000) và cuối ngày (23:59:59.999) trước khi đổi sang ISO string
 * gửi API (`dateFrom`/`dateTo`).
 */

export type PeriodKind = "date" | "week" | "month" | "quarter" | "custom";

export interface PeriodRange {
  kind: PeriodKind;
  /** `null` nghĩa là không giới hạn (dùng cho "All time"). */
  from: Date | null;
  to: Date | null;
  label: string;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Date -> "dd/mm/yyyy". */
export function formatDayLabel(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

/** Tuần bắt đầu Thứ 2 (Mon), kết thúc Chủ nhật (Sun) — khớp lưới `DayCalendarModal`. */
export function startOfWeek(date: Date): Date {
  const next = startOfDay(date);
  const day = next.getDay(); // 0 = Sun .. 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const next = new Date(start);
  next.setDate(next.getDate() + 6);
  return endOfDay(next);
}

export function dayRange(date: Date, label?: string): PeriodRange {
  return {
    kind: "date",
    from: startOfDay(date),
    to: endOfDay(date),
    label: label ?? formatDayLabel(date),
  };
}

export function todayRange(now: Date = new Date()): PeriodRange {
  return { ...dayRange(now), label: "Today" };
}

export function yesterdayRange(now: Date = new Date()): PeriodRange {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return { ...dayRange(yesterday), label: "Yesterday" };
}

export function weekRange(date: Date, label?: string): PeriodRange {
  const from = startOfWeek(date);
  const to = endOfWeek(date);
  return {
    kind: "week",
    from,
    to,
    label: label ?? `${formatDayLabel(from)} - ${formatDayLabel(to)}`,
  };
}

export function thisWeekRange(now: Date = new Date()): PeriodRange {
  return { ...weekRange(now), label: "This week" };
}

export function lastWeekRange(now: Date = new Date()): PeriodRange {
  const previous = new Date(now);
  previous.setDate(previous.getDate() - 7);
  return { ...weekRange(previous), label: "Last week" };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** `monthIndex`: 0 = January .. 11 = December. */
export function monthRange(
  year: number,
  monthIndex: number,
  label?: string,
): PeriodRange {
  const from = startOfDay(new Date(year, monthIndex, 1));
  const to = endOfDay(new Date(year, monthIndex + 1, 0));
  return {
    kind: "month",
    from,
    to,
    label: label ?? `${MONTH_NAMES[monthIndex]}/${year}`,
  };
}

export function thisMonthRange(now: Date = new Date()): PeriodRange {
  return { ...monthRange(now.getFullYear(), now.getMonth()), label: "This month" };
}

export function lastMonthRange(now: Date = new Date()): PeriodRange {
  const month = now.getMonth() - 1;
  const year = month < 0 ? now.getFullYear() - 1 : now.getFullYear();
  return { ...monthRange(year, (month + 12) % 12), label: "Last month" };
}

const QUARTER_LABELS = ["Quarter I", "Quarter II", "Quarter III", "Quarter IV"];

/** `quarter`: 1 .. 4. */
export function quarterRange(year: number, quarter: number): PeriodRange {
  const startMonth = (quarter - 1) * 3;
  const from = startOfDay(new Date(year, startMonth, 1));
  const to = endOfDay(new Date(year, startMonth + 3, 0));
  return { kind: "quarter", from, to, label: QUARTER_LABELS[quarter - 1] };
}

export function customRange(from: Date, to: Date): PeriodRange {
  return {
    kind: "custom",
    from: startOfDay(from),
    to: endOfDay(to),
    label: `${formatDayLabel(from)} - ${formatDayLabel(to)}`,
  };
}

export function allTimeRange(): PeriodRange {
  return { kind: "custom", from: null, to: null, label: "All time" };
}

/** Khoảng chứa `date` trong tuần Mon–Sun — dùng khi bấm "Select week". */
export function weekRangeContaining(date: Date): PeriodRange {
  return weekRange(date);
}

export interface CalendarCell {
  date: Date;
  /** `false` nếu ô thuộc tháng trước/sau, hiển thị mờ và không bấm được. */
  inMonth: boolean;
}

/**
 * Lưới ngày Mon–Sun cho `DayCalendarModal`/`RangeCalendarModal` — luôn đủ số
 * tuần trọn vẹn (6 hàng) để hiển thị ổn định giữa các tháng.
 */
export function buildCalendarGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const gridStart = startOfWeek(firstOfMonth);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    cells.push({ date, inMonth: date.getMonth() === monthIndex });
  }
  return cells;
}

/** So sánh hai `Date` chỉ theo ngày (bỏ giờ/phút/giây). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
