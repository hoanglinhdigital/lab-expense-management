/**
 * Kiểu dữ liệu và hằng số cấu hình cho màn hình Home (dashboard).
 *
 * Giữ tách khỏi `record-types.ts` vì Home chỉ đọc dữ liệu tổng hợp, không dùng
 * chung "hợp đồng" form của màn Record.
 */

/** Preset khoảng thời gian của khối "Expense analysis". */
export type PeriodRange = "3M" | "6M" | "12M";

export interface PeriodOption {
  value: PeriodRange;
  label: string;
  /** Số tháng gần nhất được tính vào biểu đồ. */
  months: number;
}

/** Thứ tự trong mảng = thứ tự hiển thị trong dropdown. */
export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "3M", label: "3 tháng gần nhất", months: 3 },
  { value: "6M", label: "6 tháng gần nhất", months: 6 },
  { value: "12M", label: "12 tháng gần nhất", months: 12 },
];

export function getPeriodOption(range: PeriodRange): PeriodOption {
  const option = PERIOD_OPTIONS.find((item) => item.value === range);
  // PERIOD_OPTIONS phủ hết union PeriodRange nên nhánh này không xảy ra lúc chạy.
  return option ?? PERIOD_OPTIONS[1];
}

/**
 * Màu các lát donut "tỷ trọng chi tiêu". Chỉ dùng các hue đã có trong bảng màu
 * của skill `frontend-coding` (rose = chi tiêu, amber = warning, slate = phụ).
 * Viết class đầy đủ vì Tailwind quét source tĩnh; nhóm thứ 6 trở đi quay vòng.
 */
export const DONUT_COLORS: readonly string[] = [
  "text-rose-600",
  "text-amber-500",
  "text-rose-400",
  "text-amber-300",
  "text-slate-400",
];

export function donutColor(index: number): string {
  return DONUT_COLORS[index % DONUT_COLORS.length];
}

export interface UserSummary {
  name: string;
}

export interface BalanceSummary {
  total: number;
  currency: string;
}

/** Tổng thu / chi của kỳ đang xem. `different` = income − expense. */
export interface FlowSummary {
  income: number;
  expense: number;
  currency: string;
}

/** Một lát donut = một nhóm category cha. */
export interface CategorySlice {
  id: string;
  name: string;
  amount: number;
}

export interface ExchangeRate {
  /** Mã tiền tệ ISO 4217, ví dụ "USD". */
  code: string;
  /** Ký hiệu hiển thị to ở đầu dòng, ví dụ "$". */
  symbol: string;
  /** Mã vùng hiển thị bên phải, ví dụ "US". */
  region: string;
  /** 1 đơn vị `code` đổi được bao nhiêu đơn vị tiền tệ gốc của user. */
  rate: number;
}

export interface MonthlyPoint {
  /** "yyyy-MM" */
  month: string;
  amount: number;
}

export type LoanKind = "LEND" | "BORROW";

export interface LoanItem {
  id: string;
  kind: LoanKind;
  note: string;
  amount: number;
  /** "yyyy-MM-dd" */
  date: string;
}

export interface HomeOverview {
  user: UserSummary;
  balance: BalanceSummary;
  flow: FlowSummary;
  expenseByCategory: CategorySlice[];
  exchangeRates: ExchangeRate[];
  monthly: MonthlyPoint[];
  loans: LoanItem[];
}
