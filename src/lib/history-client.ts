/**
 * Lớp dữ liệu phía client cho màn History (danh sách + chi tiết/sửa/xoá) —
 * gọi `GET /api/transactions`, `GET/PATCH/DELETE /api/transactions/{id}`
 * (`docs/api-spec/transaction.yaml`). Tái dùng map DTO -> Option của
 * `record-client.ts` để không lặp logic.
 */

import { apiFetch, buildQuery, fromDecimal, toDecimal } from "./api/client";
import { toDateInputValue, toDateTime, toTimeInputValue } from "./format";
import type { PeriodRange } from "./period";
import type { TransactionListItem } from "./history-types";
import {
  getRecordTypeConfig,
  type RecordFormState,
  type RecordType,
} from "./record-types";

interface AccountRefDto {
  id: string;
  name: string;
  currency: string;
  icon: string | null;
}

interface CategoryRefDto {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
  color: string | null;
  parentId: string | null;
}

interface ContactRefDto {
  id: string;
  name: string;
}

interface TransactionDto {
  id: string;
  type: RecordType;
  amount: string;
  receiveAmount: string | null;
  currency: string;
  date: string;
  note: string | null;
  fromAccount: AccountRefDto;
  toAccount: AccountRefDto | null;
  category: CategoryRefDto | null;
  contact: ContactRefDto | null;
}

interface TransactionListMetaDto {
  page: number;
  pageSize: number;
  total: number;
}

/** Icon mặc định khi giao dịch không có category (Transfer/Borrow/Lend). */
const DEFAULT_ICON_BY_TYPE: Record<RecordType, string> = {
  EXPENSE: "💸",
  INCOME: "💰",
  TRANSFER: "🔁",
  BORROW: "🤝",
  LEND: "🤝",
  ADJUSTMENT: "⚖️",
};

function toListItem(dto: TransactionDto): TransactionListItem {
  const title =
    dto.category?.name ??
    dto.contact?.name ??
    getRecordTypeConfig(dto.type).label;

  return {
    id: dto.id,
    type: dto.type,
    amount: fromDecimal(dto.amount),
    currency: dto.currency,
    date: dto.date,
    note: dto.note,
    fromAccountName: dto.fromAccount.name,
    fromAccountCurrency: dto.fromAccount.currency,
    icon: dto.category?.icon || DEFAULT_ICON_BY_TYPE[dto.type],
    title,
  };
}

export interface TransactionPage {
  items: TransactionListItem[];
  page: number;
  pageSize: number;
  total: number;
}

const PAGE_SIZE = 20;

export async function fetchTransactions(
  range: PeriodRange,
  page: number,
): Promise<TransactionPage> {
  const query = buildQuery({
    page,
    pageSize: PAGE_SIZE,
    dateFrom: range.from?.toISOString(),
    dateTo: range.to?.toISOString(),
  });
  const { data, meta } = await apiFetch<{
    data: TransactionDto[];
    meta: TransactionListMetaDto;
  }>(`/transactions${query}`);

  return {
    items: data.map(toListItem),
    page: meta.page,
    pageSize: meta.pageSize,
    total: meta.total,
  };
}

export async function fetchTransactionDetail(id: string): Promise<{
  type: RecordType;
  form: RecordFormState;
}> {
  const { data } = await apiFetch<{ data: TransactionDto }>(
    `/transactions/${id}`,
  );
  const date = new Date(data.date);

  const form: RecordFormState = {
    type: data.type,
    amount: String(fromDecimal(data.amount)),
    receiveAmount: data.receiveAmount ? String(fromDecimal(data.receiveAmount)) : "",
    newBalance: "",
    fromAccountId: data.fromAccount.id,
    toAccountId: data.toAccount?.id ?? "",
    categoryId: data.category?.id ?? "",
    contactId: data.contact?.id ?? "",
    date: toDateInputValue(date),
    time: toTimeInputValue(date),
    note: data.note ?? "",
  };

  return { type: data.type, form };
}

export async function updateTransaction(
  id: string,
  form: RecordFormState,
): Promise<void> {
  const config = getRecordTypeConfig(form.type);
  const date = toDateTime(form.date, form.time).toISOString();

  await apiFetch(`/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      type: form.type,
      amount: toDecimal(numberOf(form.amount)),
      receiveAmount:
        config.hasToAccount && form.receiveAmount
          ? toDecimal(numberOf(form.receiveAmount))
          : null,
      date,
      note: form.note.trim() || null,
      fromAccountId: form.fromAccountId,
      toAccountId: config.hasToAccount ? form.toAccountId : null,
      categoryId: config.hasCategory ? form.categoryId : null,
      contactId: config.hasContact ? form.contactId : null,
    }),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiFetch(`/transactions/${id}`, { method: "DELETE" });
}

function numberOf(raw: string): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}
