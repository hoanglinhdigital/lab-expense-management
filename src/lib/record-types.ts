/**
 * Kiểu dữ liệu và cấu hình cho màn hình Record.
 *
 * Lưu ý: `ADJUSTMENT` chưa có trong enum `TransactionType` của Prisma. Mockup có
 * loại này nên frontend khai báo riêng; cần một task backend bổ sung enum +
 * migration trước khi nối API thật.
 */

export type RecordType =
  | "EXPENSE"
  | "INCOME"
  | "TRANSFER"
  | "BORROW"
  | "LEND"
  | "ADJUSTMENT";

export type CategoryType = "EXPENSE" | "INCOME";

export interface RecordTypeConfig {
  value: RecordType;
  label: string;
  /** Class màu nhấn — viết đầy đủ vì Tailwind quét source tĩnh. */
  textClass: string;
  borderClass: string;
  /** Bật/tắt từng khối trong form. */
  hasAmount: boolean;
  hasCategory: boolean;
  hasToAccount: boolean;
  hasContact: boolean;
  hasBalanceAdjust: boolean;
  /** Category nào được chọn sẵn khi mở sheet. */
  categoryType?: CategoryType;
}

const NEUTRAL_TEXT = "text-slate-800";
const NEUTRAL_BORDER = "border-slate-300";

/** Thứ tự trong mảng = thứ tự trong dropdown chọn loại giao dịch. */
export const RECORD_TYPES: RecordTypeConfig[] = [
  {
    value: "EXPENSE",
    label: "Expense",
    textClass: "text-rose-600",
    borderClass: "border-rose-600",
    hasAmount: true,
    hasCategory: true,
    hasToAccount: false,
    hasContact: false,
    hasBalanceAdjust: false,
    categoryType: "EXPENSE",
  },
  {
    value: "INCOME",
    label: "Income",
    textClass: "text-emerald-600",
    borderClass: "border-emerald-600",
    hasAmount: true,
    hasCategory: true,
    hasToAccount: false,
    hasContact: false,
    hasBalanceAdjust: false,
    categoryType: "INCOME",
  },
  {
    value: "TRANSFER",
    label: "Transfer",
    textClass: NEUTRAL_TEXT,
    borderClass: NEUTRAL_BORDER,
    hasAmount: true,
    hasCategory: false,
    hasToAccount: true,
    hasContact: false,
    hasBalanceAdjust: false,
  },
  {
    value: "BORROW",
    label: "Borrow",
    textClass: NEUTRAL_TEXT,
    borderClass: NEUTRAL_BORDER,
    hasAmount: true,
    hasCategory: false,
    hasToAccount: false,
    hasContact: true,
    hasBalanceAdjust: false,
  },
  {
    value: "LEND",
    label: "Lend",
    textClass: NEUTRAL_TEXT,
    borderClass: NEUTRAL_BORDER,
    hasAmount: true,
    hasCategory: false,
    hasToAccount: false,
    hasContact: true,
    hasBalanceAdjust: false,
  },
  {
    value: "ADJUSTMENT",
    label: "Adjustment",
    textClass: NEUTRAL_TEXT,
    borderClass: NEUTRAL_BORDER,
    hasAmount: false,
    hasCategory: true,
    hasToAccount: false,
    hasContact: false,
    hasBalanceAdjust: true,
    categoryType: "EXPENSE",
  },
];

export function getRecordTypeConfig(type: RecordType): RecordTypeConfig {
  const config = RECORD_TYPES.find((item) => item.value === type);
  // RECORD_TYPES phủ hết union RecordType nên nhánh này không xảy ra lúc chạy.
  return config ?? RECORD_TYPES[0];
}

/**
 * Adjustment không phải một loại giao dịch riêng ở backend: số dư mới lớn hơn
 * số dư hiện tại được ghi thành một giao dịch `INCOME`, nhỏ hơn thành `EXPENSE`.
 * Vì vậy category cho phép chọn trong `AdjustmentForm` phải đổi theo dấu của
 * `difference` tại thời điểm nhập, không cố định một loại như các RecordType khác.
 */
export function adjustmentCategoryType(difference: number): CategoryType {
  return difference < 0 ? "EXPENSE" : "INCOME";
}

export interface AccountOption {
  id: string;
  name: string;
  currency: string;
  balance: number;
  /** Chữ cái hiển thị trong avatar tròn, theo mockup ($ cho Cash, B cho Bank...). */
  symbol: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  /** Emoji do người dùng chọn — dữ liệu, không phải icon giao diện. */
  icon: string;
  type: CategoryType;
  parentId: string | null;
  /** Số lần đã dùng, để xếp nhóm "Most used". */
  usageCount: number;
}

export interface ContactOption {
  id: string;
  name: string;
}

export interface RecordOptions {
  accounts: AccountOption[];
  categories: CategoryOption[];
  contacts: ContactOption[];
  /** Tỷ giá quy đổi 1 đơn vị của currency nguồn sang currency đích. */
  exchangeRates: Record<string, number>;
}

export interface RecordFormState {
  type: RecordType;
  /** Chuỗi số thô (chưa format), rỗng nghĩa là chưa nhập. */
  amount: string;
  receiveAmount: string;
  newBalance: string;
  fromAccountId: string;
  toAccountId: string;
  categoryId: string;
  contactId: string;
  /** "yyyy-MM-dd" */
  date: string;
  /** "HH:mm" */
  time: string;
  note: string;
}

export type RecordFieldErrors = Partial<
  Record<
    | "amount"
    | "receiveAmount"
    | "newBalance"
    | "fromAccountId"
    | "toAccountId"
    | "categoryId"
    | "contactId",
    string
  >
>;

/**
 * Props dùng chung cho 4 component form của màn Record. Khai báo một chỗ để 4
 * form nhận cùng một "hợp đồng" và `RecordScreen` chỉ dựng bộ props một lần.
 */
export interface RecordFormProps {
  form: RecordFormState;
  options: RecordOptions;
  errors: RecordFieldErrors;
  config: RecordTypeConfig;
  onChange: <K extends keyof RecordFormState>(
    field: K,
    value: RecordFormState[K],
  ) => void;
  onOpenAccount: (target: "from" | "to") => void;
  onOpenCategory: () => void;
  onAddCategory: () => void;
  onSelectCategory: (categoryId: string) => void;
  onOpenContact: () => void;
}

/** Khoá tra tỷ giá giữa hai loại tiền tệ. */
export function rateKey(from: string, to: string): string {
  return `${from}_${to}`;
}
