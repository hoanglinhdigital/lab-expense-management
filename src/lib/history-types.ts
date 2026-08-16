/**
 * Kiểu dữ liệu và helper cho màn History (danh sách + Data setting).
 */

import type { PeriodRange } from "./period";
import { allTimeRange, thisMonthRange } from "./period";
import type { RecordType } from "./record-types";

export interface TransactionListItem {
  id: string;
  type: RecordType;
  /** Số tiền trừ/cộng ở `fromAccount`, luôn dương — dấu do `type` quyết định. */
  amount: number;
  currency: string;
  /** ISO string gốc từ API, dùng để gộp nhóm theo ngày local. */
  date: string;
  note: string | null;
  fromAccountName: string;
  fromAccountCurrency: string;
  /** Emoji hiển thị: category.icon, hoặc icon mặc định theo type khi không có category. */
  icon: string;
  /** Tên hiển thị chính (category/contact/label theo type). */
  title: string;
}

export interface TransactionGroup {
  /** "yyyy-MM-dd" theo giờ địa phương — khoá gộp nhóm. */
  dateKey: string;
  dateLabel: string;
  weekdayLabel: string;
  /** Tổng có dấu trong ngày, chỉ cộng EXPENSE(-)/INCOME(+)/BORROW(+)/LEND(-); TRANSFER trung tính. */
  netTotal: number;
  currency: string;
  items: TransactionListItem[];
}

/** Màu số tiền theo hướng ảnh hưởng ví — Transfer/Borrow/Lend dùng accent riêng ngoài `record-types.ts`. */
export function amountColorClass(type: RecordType): string {
  if (type === "EXPENSE" || type === "LEND") return "text-rose-600";
  if (type === "INCOME" || type === "BORROW") return "text-emerald-600";
  return "text-blue-600"; // TRANSFER
}

/** Dấu +/- áp dụng cho `amount` khi cộng vào tổng ngày — Transfer không tính vào tổng. */
export function amountSign(type: RecordType): 1 | -1 | 0 {
  if (type === "INCOME" || type === "BORROW") return 1;
  if (type === "EXPENSE" || type === "LEND") return -1;
  return 0;
}

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** ISO string -> "yyyy-MM-dd" theo giờ địa phương (khoá gộp nhóm theo ngày). */
export function localDateKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "yyyy-MM-dd" -> "dd/mm/yyyy". */
export function dateKeyLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

export function weekdayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return WEEKDAY_NAMES[new Date(year, month - 1, day).getDay()];
}

/**
 * Gộp danh sách giao dịch (đã sort `date desc` từ API) thành nhóm theo ngày,
 * giữ nguyên thứ tự nhóm/ trong nhóm theo dữ liệu đầu vào.
 */
export function groupByDate(items: TransactionListItem[]): TransactionGroup[] {
  const groups = new Map<string, TransactionGroup>();
  for (const item of items) {
    const dateKey = localDateKey(item.date);
    let group = groups.get(dateKey);
    if (!group) {
      group = {
        dateKey,
        dateLabel: dateKeyLabel(dateKey),
        weekdayLabel: weekdayLabel(dateKey),
        netTotal: 0,
        currency: item.currency,
        items: [],
      };
      groups.set(dateKey, group);
    }
    group.items.push(item);
    group.netTotal += amountSign(item.type) * item.amount;
  }
  return Array.from(groups.values());
}

/** `PeriodRange` -> query params cho URL `/history` (giữ lựa chọn qua điều hướng). */
export function rangeToQuery(range: PeriodRange): Record<string, string> {
  const query: Record<string, string> = { kind: range.kind, label: range.label };
  if (range.from) query.from = range.from.toISOString();
  if (range.to) query.to = range.to.toISOString();
  return query;
}

/** Đọc lại `PeriodRange` từ `URLSearchParams`; thiếu/hỏng dữ liệu thì fallback "This month". */
export function rangeFromSearchParams(params: URLSearchParams): PeriodRange {
  const kind = params.get("kind");
  const label = params.get("label");
  const fromRaw = params.get("from");
  const toRaw = params.get("to");

  if (!kind || !label) return thisMonthRange();
  if (kind === "custom" && !fromRaw && !toRaw) {
    return { ...allTimeRange(), label };
  }

  const from = fromRaw ? new Date(fromRaw) : null;
  const to = toRaw ? new Date(toRaw) : null;
  if ((fromRaw && Number.isNaN(from?.getTime())) || (toRaw && Number.isNaN(to?.getTime()))) {
    return thisMonthRange();
  }

  return {
    kind: kind as PeriodRange["kind"],
    from,
    to,
    label,
  };
}
