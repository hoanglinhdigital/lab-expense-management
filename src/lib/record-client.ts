/**
 * Lớp dữ liệu phía client cho màn hình Record.
 *
 * Chưa có API thật (`docs/api-spec/` chưa có spec cho record/account/category),
 * nên đây là stub: giả lập độ trễ mạng rồi trả về dữ liệu mẫu, và giữ thay đổi
 * trong bộ nhớ suốt phiên làm việc. Khi API sẵn sàng chỉ cần thay thân các hàm
 * bằng `fetch` — kiểu trả về giữ nguyên nên UI không phải sửa.
 */

import type {
  AccountOption,
  CategoryOption,
  CategoryType,
  ContactOption,
  RecordFormState,
  RecordOptions,
} from "./record-types";
import { rateKey } from "./record-types";

const ACCOUNTS: AccountOption[] = [
  { id: "acc-cash", name: "Cash", symbol: "$", currency: "VND", balance: 35_113_000 },
  { id: "acc-bank", name: "Bank", symbol: "B", currency: "VND", balance: 49_575_000 },
  { id: "acc-credit", name: "CreditCard", symbol: "C", currency: "VND", balance: 800_000 },
  { id: "acc-ewallet", name: "E-Wallet", symbol: "E", currency: "VND", balance: 3_749_000 },
  { id: "acc-suica", name: "Suica", symbol: "S", currency: "JPY", balance: 32_120 },
  { id: "acc-paypal", name: "Paypal", symbol: "P", currency: "USD", balance: 750 },
];

const CATEGORIES: CategoryOption[] = [
  // Nhóm cha (expense)
  { id: "cat-fixed", name: "Chi tiêu cố định", icon: "🏠", type: "EXPENSE", parentId: null, usageCount: 0 },
  { id: "cat-extra", name: "Chi tiêu phát sinh", icon: "💸", type: "EXPENSE", parentId: null, usageCount: 0 },
  { id: "cat-plan", name: "Chi tiêu có plan", icon: "🎯", type: "EXPENSE", parentId: null, usageCount: 0 },
  { id: "cat-personal", name: "Personal", icon: "🎓", type: "EXPENSE", parentId: null, usageCount: 0 },
  { id: "cat-health", name: "Health", icon: "🏃", type: "EXPENSE", parentId: null, usageCount: 0 },
  { id: "cat-pet", name: "Thú cưng2", icon: "🐒", type: "EXPENSE", parentId: null, usageCount: 0 },

  // Chi tiêu cố định
  { id: "cat-rent", name: "Thuê nhà", icon: "🏠", type: "EXPENSE", parentId: "cat-fixed", usageCount: 12 },
  { id: "cat-breakfast", name: "Ăn sáng", icon: "🍕", type: "EXPENSE", parentId: "cat-fixed", usageCount: 88 },
  { id: "cat-lunch", name: "Ăn trưa", icon: "🍜", type: "EXPENSE", parentId: "cat-fixed", usageCount: 96 },
  { id: "cat-dinner", name: "Ăn tối", icon: "🍚", type: "EXPENSE", parentId: "cat-fixed", usageCount: 80 },
  { id: "cat-cafe", name: "Cafe", icon: "☕", type: "EXPENSE", parentId: "cat-fixed", usageCount: 64 },
  { id: "cat-electric", name: "Điện", icon: "💡", type: "EXPENSE", parentId: "cat-fixed", usageCount: 40 },
  { id: "cat-gas", name: "Gas", icon: "⛽", type: "EXPENSE", parentId: "cat-fixed", usageCount: 32 },
  { id: "cat-water", name: "Nước", icon: "💧", type: "EXPENSE", parentId: "cat-fixed", usageCount: 24 },
  { id: "cat-train", name: "Vé tàu", icon: "🚂", type: "EXPENSE", parentId: "cat-fixed", usageCount: 8 },

  // Chi tiêu phát sinh
  { id: "cat-party", name: "Tiệc tùng", icon: "🎉", type: "EXPENSE", parentId: "cat-extra", usageCount: 6 },
  { id: "cat-snack", name: "Ăn vặt", icon: "🍎", type: "EXPENSE", parentId: "cat-extra", usageCount: 5 },
  { id: "cat-fun", name: "Giải trí", icon: "🎮", type: "EXPENSE", parentId: "cat-extra", usageCount: 4 },
  { id: "cat-gift", name: "Quà tặng", icon: "🎁", type: "EXPENSE", parentId: "cat-extra", usageCount: 3 },
  { id: "cat-move", name: "Di chuyển", icon: "🚗", type: "EXPENSE", parentId: "cat-extra", usageCount: 2 },

  // Income
  { id: "cat-salary", name: "Lương", icon: "💵", type: "INCOME", parentId: null, usageCount: 24 },
  { id: "cat-houselend", name: "House lend", icon: "🏠", type: "INCOME", parentId: null, usageCount: 18 },
  { id: "cat-interest", name: "Interest", icon: "🏦", type: "INCOME", parentId: null, usageCount: 12 },
  { id: "cat-bonus", name: "Bonus", icon: "💰", type: "INCOME", parentId: null, usageCount: 9 },
  { id: "cat-sidejob", name: "Side Job", icon: "👨‍💻", type: "INCOME", parentId: null, usageCount: 6 },
  { id: "cat-film", name: "Đóng phim", icon: "🎬", type: "INCOME", parentId: null, usageCount: 3 },
];

const CONTACTS: ContactOption[] = [
  { id: "contact-ku", name: "Ku chó" },
  { id: "contact-nong", name: "Nọng" },
];

/** Tỷ giá mẫu — cần nguồn tỷ giá thật khi nối API. */
const EXCHANGE_RATES: Record<string, number> = {
  [rateKey("VND", "USD")]: 0.000038,
  [rateKey("USD", "VND")]: 26_315,
  [rateKey("VND", "JPY")]: 0.0059,
  [rateKey("JPY", "VND")]: 169.5,
  [rateKey("USD", "JPY")]: 155.2,
  [rateKey("JPY", "USD")]: 0.0064,
};

/** Bản sao trong bộ nhớ để category/contact vừa tạo hiện ra ngay. */
const state = {
  categories: [...CATEGORIES],
  contacts: [...CONTACTS],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

export async function fetchRecordOptions(): Promise<RecordOptions> {
  await delay(500);
  // TODO: thay bằng GET /api/record/options khi API sẵn sàng.
  return {
    accounts: ACCOUNTS,
    categories: [...state.categories],
    contacts: [...state.contacts],
    exchangeRates: EXCHANGE_RATES,
  };
}

export interface CreateCategoryInput {
  name: string;
  icon: string;
  type: CategoryType;
  parentId: string | null;
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<CategoryOption> {
  await delay(400);
  // TODO: thay bằng POST /api/categories khi API sẵn sàng.
  const category: CategoryOption = {
    id: createId("cat"),
    name: input.name,
    icon: input.icon,
    type: input.type,
    parentId: input.parentId,
    usageCount: 0,
  };
  state.categories = [...state.categories, category];
  return category;
}

export async function createContact(name: string): Promise<ContactOption> {
  await delay(400);
  // TODO: thay bằng POST /api/contacts khi API sẵn sàng.
  const contact: ContactOption = { id: createId("contact"), name };
  state.contacts = [...state.contacts, contact];
  return contact;
}

export async function saveTransaction(
  form: RecordFormState,
): Promise<{ id: string }> {
  await delay(600);
  // TODO: thay bằng POST /api/transactions khi API sẵn sàng.
  void form;
  return { id: createId("txn") };
}
