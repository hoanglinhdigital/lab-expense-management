/**
 * Kiểu dữ liệu và cấu hình cho màn hình Account.
 *
 * Lưu ý: mockup chỉ liệt kê 4 loại tài khoản (Cash · Bank · Card · E-Wallet) nên
 * `AccountKind` là tập con của enum `AccountType` trong Prisma. Các giá trị còn
 * lại (SAVING_ACCOUNT, IC_CARD, INVESTMENT, OTHER) nằm ngoài phạm vi task này.
 */

export type AccountKind = "CASH" | "BANK_ACCOUNT" | "CREDIT_CARD" | "E_WALLET";

export interface AccountKindConfig {
  value: AccountKind;
  label: string;
}

/** Thứ tự trong mảng = thứ tự trong sheet "Account type". */
export const ACCOUNT_KINDS: AccountKindConfig[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_ACCOUNT", label: "Bank" },
  { value: "CREDIT_CARD", label: "Card" },
  { value: "E_WALLET", label: "E-Wallet" },
];

export function accountKindLabel(kind: AccountKind): string {
  const config = ACCOUNT_KINDS.find((item) => item.value === kind);
  // ACCOUNT_KINDS phủ hết union AccountKind nên nhánh này không xảy ra lúc chạy.
  return config?.label ?? ACCOUNT_KINDS[0].label;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
}

/** Thứ tự trong mảng = thứ tự trong sheet "Currency". */
export const CURRENCIES: CurrencyConfig[] = [
  { code: "VND", symbol: "đ" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "JPY", symbol: "¥" },
  { code: "GBP", symbol: "£" },
  { code: "SGD", symbol: "S$" },
  { code: "AUD", symbol: "A$" },
  { code: "CAD", symbol: "C$" },
  { code: "CNY", symbol: "¥" },
];

export const DEFAULT_CURRENCY = "VND";

/** Mã tiền tệ lạ (dữ liệu cũ) thì hiển thị luôn mã thay vì ký hiệu. */
export function currencySymbol(code: string): string {
  return CURRENCIES.find((item) => item.code === code)?.symbol ?? code;
}

export interface AccountItem {
  id: string;
  name: string;
  kind: AccountKind;
  currency: string;
  balance: number;
  description: string;
}

export interface AccountGroup {
  id: string;
  title: string;
  accounts: AccountItem[];
}

export interface AccountOverview {
  /** Tổng số dư quy về `currency` — tài khoản khác tiền tệ đã được quy đổi ở tầng dữ liệu. */
  totalBalance: number;
  currency: string;
  groups: AccountGroup[];
}

export interface AccountFormState {
  /** Chuỗi số thô (chưa format), rỗng nghĩa là chưa nhập. */
  balance: string;
  name: string;
  kind: AccountKind;
  currency: string;
  description: string;
}

export type AccountFieldErrors = Partial<Record<"name" | "balance", string>>;

export const MAX_ACCOUNT_NAME_LENGTH = 50;
export const MAX_ACCOUNT_DESCRIPTION_LENGTH = 200;

/** Chữ cái hiển thị trong avatar tròn của mỗi tài khoản. */
export function accountInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function createEmptyAccountForm(): AccountFormState {
  return {
    balance: "",
    name: "",
    kind: "CASH",
    currency: DEFAULT_CURRENCY,
    description: "",
  };
}
