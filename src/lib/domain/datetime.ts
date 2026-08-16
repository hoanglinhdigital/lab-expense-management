/**
 * Cắt mốc ngày/tháng theo múi giờ IANA.
 *
 * Bắt buộc phải theo giờ địa phương: một giao dịch lúc 23h30 ngày cuối tháng ở
 * `Asia/Ho_Chi_Minh` là 16h30 UTC cùng ngày, nhưng nếu cắt mốc theo UTC thì giao
 * dịch lúc 23h30 ngày 31 sẽ rơi nhầm sang tháng sau. Toàn bộ hàm ở đây nhận/trả
 * `Date` ở UTC, chỉ dùng timezone để xác định ranh giới.
 *
 * Không dùng thư viện ngoài — `Intl.DateTimeFormat` đã đủ và luôn có sẵn trong
 * Node, tránh thêm một dependency chỉ để làm mấy phép cộng trừ.
 */

import { validationError } from "@/lib/api/errors";

interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Chủ nhật … 6 = Thứ bảy */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });

  formatterCache.set(timeZone, formatter);
  return formatter;
}

export function assertValidTimezone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    throw validationError({ timezone: "Múi giờ không hợp lệ." });
  }
}

function getParts(date: Date, timeZone: string): ZonedParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) lookup[part.type] = part.value;

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
    weekday: WEEKDAY_INDEX[lookup.weekday] ?? 0,
  };
}

/** Chênh lệch (ms) giữa giờ địa phương và UTC tại đúng thời điểm `date`. */
function getOffsetMs(date: Date, timeZone: string): number {
  const p = getParts(date, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Bỏ phần mili giây vì formatter không trả về, nếu không sẽ lệch < 1s.
  return asIfUtc - (date.getTime() - date.getMilliseconds());
}

/**
 * Đổi một mốc "giờ tường" ở `timeZone` thành `Date` UTC.
 * Tính offset hai lần để mốc rơi vào ngày đổi giờ (DST) vẫn đúng.
 */
function zonedToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  const wallClock = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  let offset = getOffsetMs(new Date(wallClock), timeZone);
  const utc = wallClock - offset;
  offset = getOffsetMs(new Date(utc), timeZone);
  return new Date(wallClock - offset);
}

// --- Mốc đầu kỳ --------------------------------------------------------------

export function startOfDay(date: Date, timeZone: string): Date {
  const p = getParts(date, timeZone);
  return zonedToUtc(timeZone, p.year, p.month, p.day);
}

/** Tuần bắt đầu từ **Thứ Hai**. */
export function startOfWeek(date: Date, timeZone: string): Date {
  const p = getParts(date, timeZone);
  const daysSinceMonday = (p.weekday + 6) % 7;
  return zonedToUtc(timeZone, p.year, p.month, p.day - daysSinceMonday);
}

export function startOfMonth(date: Date, timeZone: string): Date {
  const p = getParts(date, timeZone);
  return zonedToUtc(timeZone, p.year, p.month, 1);
}

export function startOfYear(date: Date, timeZone: string): Date {
  const p = getParts(date, timeZone);
  return zonedToUtc(timeZone, p.year, 1, 1);
}

// --- Mốc cuối kỳ (bao gồm mốc, lấy đầu kỳ sau trừ 1ms) -----------------------

export function endOfDay(date: Date, timeZone: string): Date {
  const p = getParts(date, timeZone);
  return new Date(zonedToUtc(timeZone, p.year, p.month, p.day + 1).getTime() - 1);
}

export function endOfWeek(date: Date, timeZone: string): Date {
  const start = startOfWeek(date, timeZone);
  const p = getParts(start, timeZone);
  return new Date(zonedToUtc(timeZone, p.year, p.month, p.day + 7).getTime() - 1);
}

export function endOfMonth(date: Date, timeZone: string): Date {
  const p = getParts(date, timeZone);
  return new Date(zonedToUtc(timeZone, p.year, p.month + 1, 1).getTime() - 1);
}

export function endOfYear(date: Date, timeZone: string): Date {
  const p = getParts(date, timeZone);
  return new Date(zonedToUtc(timeZone, p.year + 1, 1, 1).getTime() - 1);
}

// --- Tháng -------------------------------------------------------------------

/** Khoá tháng `yyyy-MM` theo giờ địa phương. */
export function formatMonthKey(date: Date, timeZone: string): string {
  const p = getParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

/**
 * Danh sách khoá tháng liên tiếp từ `from` tới `to` (bao gồm cả hai), cũ → mới.
 * Dùng để biểu đồ cột luôn đủ mốc trục X kể cả tháng không phát sinh giao dịch.
 */
export function listMonthKeys(from: Date, to: Date, timeZone: string): string[] {
  const start = getParts(from, timeZone);
  const end = getParts(to, timeZone);

  const keys: string[] = [];
  let year = start.year;
  let month = start.month;

  while (year < end.year || (year === end.year && month <= end.month)) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return keys;
}

/** Khoảng `months` tháng gần nhất, **tính cả** tháng chứa `reference`. */
export function lastMonthsRange(
  months: number,
  timeZone: string,
  reference: Date = new Date(),
): { dateFrom: Date; dateTo: Date } {
  const p = getParts(reference, timeZone);
  return {
    dateFrom: zonedToUtc(timeZone, p.year, p.month - (months - 1), 1),
    dateTo: endOfMonth(reference, timeZone),
  };
}
