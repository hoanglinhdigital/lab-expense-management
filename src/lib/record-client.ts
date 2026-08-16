/**
 * Lớp dữ liệu phía client cho màn hình Record — gọi
 * `GET /api/accounts`, `GET /api/categories`, `GET /api/contacts`,
 * `GET /api/utility/exchange-rate`, `POST /api/categories`,
 * `POST /api/contacts`, `POST /api/transactions`
 * (`docs/api-spec/{account,category,contact,currency,transaction}.yaml`).
 *
 * Adjustment không phải một loại giao dịch riêng ở backend — xem
 * `saveTransaction()` và `adjustmentCategoryType()` trong `record-types.ts`.
 */

import { apiFetch, buildQuery, fromDecimal, toDecimal } from "./api/client";
import { amountToNumber, toDateTime } from "./format";
import {
  adjustmentCategoryType,
  getRecordTypeConfig,
  rateKey,
  type AccountOption,
  type CategoryOption,
  type CategoryType,
  type ContactOption,
  type RecordFormState,
  type RecordOptions,
} from "./record-types";

interface AccountDto {
  id: string;
  name: string;
  currency: string;
  currentBalance: string;
}

interface CategoryDto {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null;
  icon: string | null;
  usageCount?: number;
}

interface ContactDto {
  id: string;
  name: string;
}

interface ExchangeRateDto {
  code: string;
  base: string;
  rate: string;
}

interface TransactionDto {
  id: string;
}

function toAccountOption(dto: AccountDto): AccountOption {
  return {
    id: dto.id,
    name: dto.name,
    currency: dto.currency,
    balance: fromDecimal(dto.currentBalance),
    symbol: dto.name.trim().charAt(0).toUpperCase() || "?",
  };
}

function toCategoryOption(dto: CategoryDto): CategoryOption {
  return {
    id: dto.id,
    name: dto.name,
    icon: dto.icon ?? "",
    type: dto.type,
    parentId: dto.parentId,
    usageCount: dto.usageCount ?? 0,
  };
}

function toContactOption(dto: ContactDto): ContactOption {
  return { id: dto.id, name: dto.name };
}

export async function fetchRecordOptions(): Promise<RecordOptions> {
  const [accountsRes, categoriesRes, contactsRes] = await Promise.all([
    apiFetch<{ data: AccountDto[] }>(`/accounts${buildQuery({ pageSize: 100 })}`),
    apiFetch<{ data: CategoryDto[] }>(`/categories${buildQuery({ pageSize: 200 })}`),
    apiFetch<{ data: ContactDto[] }>(`/contacts${buildQuery({ pageSize: 100 })}`),
  ]);

  const accounts = accountsRes.data.map(toAccountOption);
  const categories = categoriesRes.data.map(toCategoryOption);
  const contacts = contactsRes.data.map(toContactOption);

  // Tỷ giá chỉ cần khi có từ 2 loại tiền tệ trở lên trong danh sách account
  // (Transfer giữa hai account cùng tiền tệ không cần quy đổi).
  const currencies = Array.from(new Set(accounts.map((item) => item.currency)));
  const exchangeRates: Record<string, number> = {};
  if (currencies.length > 1) {
    await Promise.all(
      currencies.map(async (to) => {
        const { data } = await apiFetch<{ data: ExchangeRateDto[] }>(
          `/utility/exchange-rate${buildQuery({ base: to, pageSize: 200 })}`,
        );
        for (const entry of data) {
          if (currencies.includes(entry.code)) {
            exchangeRates[rateKey(entry.code, to)] = fromDecimal(entry.rate);
          }
        }
      }),
    );
  }

  return { accounts, categories, contacts, exchangeRates };
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
  const { data } = await apiFetch<{ data: CategoryDto }>("/categories", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      type: input.type,
      parentId: input.parentId,
      icon: input.icon || null,
    }),
  });
  return toCategoryOption(data);
}

export async function createContact(name: string): Promise<ContactOption> {
  const { data } = await apiFetch<{ data: ContactDto }>("/contacts", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return toContactOption(data);
}

export async function saveTransaction(
  form: RecordFormState,
  options: RecordOptions,
): Promise<{ id: string }> {
  const date = toDateTime(form.date, form.time).toISOString();

  if (form.type === "ADJUSTMENT") {
    const account = options.accounts.find(
      (item) => item.id === form.fromAccountId,
    );
    const difference = amountToNumber(form.newBalance) - (account?.balance ?? 0);
    const type = adjustmentCategoryType(difference);
    const { data } = await apiFetch<{ data: TransactionDto }>("/transactions", {
      method: "POST",
      body: JSON.stringify({
        type,
        amount: toDecimal(Math.abs(difference)),
        date,
        note: `ADJUST-${form.note.trim()}`,
        fromAccountId: form.fromAccountId,
        categoryId: form.categoryId,
      }),
    });
    return { id: data.id };
  }

  const config = getRecordTypeConfig(form.type);
  const { data } = await apiFetch<{ data: TransactionDto }>("/transactions", {
    method: "POST",
    body: JSON.stringify({
      type: form.type,
      amount: toDecimal(amountToNumber(form.amount)),
      receiveAmount:
        config.hasToAccount && form.receiveAmount
          ? toDecimal(amountToNumber(form.receiveAmount))
          : null,
      date,
      note: form.note.trim() || null,
      fromAccountId: form.fromAccountId,
      toAccountId: config.hasToAccount ? form.toAccountId : null,
      categoryId: config.hasCategory ? form.categoryId : null,
      contactId: config.hasContact ? form.contactId : null,
    }),
  });
  return { id: data.id };
}
