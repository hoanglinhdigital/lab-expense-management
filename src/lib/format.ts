/**
 * Helper định dạng dùng chung cho toàn app — mọi nơi hiển thị tiền/ngày giờ
 * đều đi qua đây để cả app hiển thị giống hệt nhau.
 */

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

/** 1234567 -> "1,234,567". Phần thập phân giữ tối đa 2 chữ số. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    amount,
  );
}

/** Số tiền kèm mã tiền tệ: "1,234,567 VND". */
export function formatMoney(amount: number, currency: string): string {
  return `${formatCurrency(amount)} ${currency}`;
}

/**
 * Chuẩn hoá chuỗi người dùng gõ vào ô số tiền: bỏ mọi ký tự không phải chữ số
 * (chỉ giữ lại một dấu chấm thập phân đầu tiên).
 */
export function parseAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
}

/** Chuỗi số thô -> chuỗi hiển thị có phân cách hàng nghìn, giữ nguyên phần đang gõ dở. */
export function formatAmountInput(raw: string): string {
  if (!raw) return "";
  const [integerPart, decimalPart] = raw.split(".");
  const grouped = integerPart ? NUMBER_FORMATTER.format(Number(integerPart)) : "";
  return decimalPart === undefined ? grouped : `${grouped}.${decimalPart}`;
}

export function amountToNumber(raw: string): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Date -> "2026-08-16" (khớp value của <input type="date">, theo giờ địa phương). */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Date -> "22:00" (khớp value của <input type="time">). */
export function toTimeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "2026-08-16" -> "16/08/2026". Chuỗi không đúng định dạng thì giữ nguyên. */
export function formatDate(dateValue: string): string {
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;
  return `${day}/${month}/${year}`;
}

/**
 * "2026-08-16" -> "Today 16/08/2026" nếu đúng hôm nay, ngược lại "16/08/2026".
 * So sánh trên chuỗi ngày địa phương để không lệch múi giờ.
 */
export function formatDateLabel(dateValue: string, today = new Date()): string {
  const label = formatDate(dateValue);
  if (label === dateValue) return dateValue;
  return dateValue === toDateInputValue(today) ? `Today ${label}` : label;
}

/** Ghép ngày + giờ từ hai input thành một Date. */
export function toDateTime(dateValue: string, timeValue: string): Date {
  return new Date(`${dateValue}T${timeValue || "00:00"}`);
}
