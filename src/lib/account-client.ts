/**
 * Lớp dữ liệu phía client cho màn hình Account.
 *
 * Chưa có API thật (`docs/api-spec/` chưa có spec cho account), nên đây là stub:
 * giả lập độ trễ mạng rồi trả về dữ liệu mẫu, và giữ tài khoản vừa tạo trong bộ
 * nhớ suốt phiên làm việc. Khi API sẵn sàng chỉ cần thay thân các hàm bằng
 * `fetch` — kiểu trả về giữ nguyên nên UI không phải sửa.
 */

import { DEFAULT_CURRENCY, type AccountItem, type AccountOverview } from "./account-types";
import type { AccountKind } from "./account-types";

const SPENDING_GROUP = { id: "group-spending", title: "Spending account" };

const ACCOUNTS: AccountItem[] = [
  { id: "acc-cash", name: "Cash", kind: "CASH", currency: "VND", balance: 34_913_000, description: "" },
  { id: "acc-bank", name: "Bank", kind: "BANK_ACCOUNT", currency: "VND", balance: 49_265_000, description: "" },
  { id: "acc-credit", name: "CreditCard", kind: "CREDIT_CARD", currency: "VND", balance: 800_000, description: "" },
  { id: "acc-ewallet", name: "E-Wallet", kind: "E_WALLET", currency: "VND", balance: 3_749_000, description: "" },
  { id: "acc-suica", name: "Suica", kind: "E_WALLET", currency: "JPY", balance: 32_120, description: "" },
  { id: "acc-paypal", name: "Paypal", kind: "E_WALLET", currency: "USD", balance: 750, description: "" },
];

/** Tỷ giá mẫu quy về VND — cần nguồn tỷ giá thật khi nối API. */
const RATE_TO_VND: Record<string, number> = {
  VND: 1,
  USD: 26_315,
  EUR: 28_600,
  JPY: 169.5,
  GBP: 33_400,
  SGD: 19_500,
  AUD: 17_200,
  CAD: 19_100,
  CNY: 3_650,
};

/** Bản sao trong bộ nhớ để tài khoản vừa tạo hiện ra ngay. */
const state = {
  accounts: [...ACCOUNTS],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

/** Tài khoản khác tiền tệ được quy đổi trước khi cộng vào tổng. */
function totalIn(accounts: AccountItem[], currency: string): number {
  const base = RATE_TO_VND[currency] ?? 1;
  return accounts.reduce((sum, account) => {
    const rate = RATE_TO_VND[account.currency] ?? 0;
    return sum + (account.balance * rate) / base;
  }, 0);
}

export async function fetchAccountOverview(): Promise<AccountOverview> {
  await delay(500);
  // TODO: thay bằng GET /api/accounts khi API sẵn sàng.
  const accounts = [...state.accounts];
  return {
    totalBalance: Math.round(totalIn(accounts, DEFAULT_CURRENCY)),
    currency: DEFAULT_CURRENCY,
    groups: [{ ...SPENDING_GROUP, accounts }],
  };
}

export interface CreateAccountInput {
  name: string;
  kind: AccountKind;
  currency: string;
  balance: number;
  description: string;
}

export async function createAccount(
  input: CreateAccountInput,
): Promise<AccountItem> {
  await delay(500);
  // TODO: thay bằng POST /api/accounts khi API sẵn sàng.
  const account: AccountItem = {
    id: createId("acc"),
    name: input.name,
    kind: input.kind,
    currency: input.currency,
    balance: input.balance,
    description: input.description,
  };
  state.accounts = [...state.accounts, account];
  return account;
}
