/**
 * Lớp dữ liệu phía client cho màn Expense Analysis — gọi `GET
 * /api/report/expense-by-category` (có/không `parentId`), `GET
 * /api/categories/{id}` và `GET /api/transactions` (`docs/api-spec/report.yaml`,
 * `category.yaml`, `transaction.yaml`).
 */

import { apiFetch, buildQuery, fromDecimal } from "./api/client";
import type { AnalysisPeriod } from "./expense-analysis-types";

export interface CategoryBreakdownEntry {
  categoryId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface CategoryBreakdown {
  items: CategoryBreakdownEntry[];
  totalAmount: number;
  currency: string;
}

interface CategoryBreakdownItemDto {
  categoryId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  amount: string;
  percentage: number;
  transactionCount: number;
}

interface CategoryBreakdownResponseDto {
  data: CategoryBreakdownItemDto[];
  meta: { totalAmount: string; range: { currency: string } };
}

/** Lấy đủ toàn bộ danh mục trong một lần gọi — donut cần hiển thị hết, không phân trang trên UI. */
const BREAKDOWN_PAGE_SIZE = 100;

export async function fetchCategoryBreakdown(
  period: AnalysisPeriod,
  parentId?: string,
): Promise<CategoryBreakdown> {
  const query = buildQuery({
    dateFrom: period.from.toISOString(),
    dateTo: period.to.toISOString(),
    flow: "EXPENSE",
    pageSize: BREAKDOWN_PAGE_SIZE,
    parentId,
  });
  const { data, meta } = await apiFetch<CategoryBreakdownResponseDto>(
    `/report/expense-by-category${query}`,
  );

  return {
    items: data.map((item) => ({
      categoryId: item.categoryId,
      name: item.name,
      icon: item.icon,
      color: item.color,
      amount: fromDecimal(item.amount),
      percentage: item.percentage,
      transactionCount: item.transactionCount,
    })),
    totalAmount: fromDecimal(meta.totalAmount),
    currency: meta.range.currency,
  };
}

export interface CategorySummary {
  id: string;
  name: string;
  icon: string | null;
}

interface CategoryDto {
  id: string;
  name: string;
  icon: string | null;
}

export async function fetchCategorySummary(categoryId: string): Promise<CategorySummary> {
  const { data } = await apiFetch<{ data: CategoryDto }>(`/categories/${categoryId}`);
  return { id: data.id, name: data.name, icon: data.icon };
}

export interface CategoryTransactionItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  accountName: string;
  accountIcon: string | null;
  note: string | null;
}

interface TransactionAccountRefDto {
  name: string;
  icon: string | null;
}

interface TransactionDto {
  id: string;
  amount: string;
  currency: string;
  date: string;
  note: string | null;
  fromAccount: TransactionAccountRefDto;
}

/** Mockup không có phân trang trong accordion — lấy tối đa theo trang và hiển thị hết. */
const TRANSACTION_PAGE_SIZE = 100;

export async function fetchCategoryTransactions(
  categoryId: string,
  period: AnalysisPeriod,
): Promise<CategoryTransactionItem[]> {
  const query = buildQuery({
    categoryId,
    dateFrom: period.from.toISOString(),
    dateTo: period.to.toISOString(),
    sort: "date_desc",
    pageSize: TRANSACTION_PAGE_SIZE,
  });
  const { data } = await apiFetch<{ data: TransactionDto[] }>(`/transactions${query}`);

  return data.map((item) => ({
    id: item.id,
    date: item.date,
    amount: fromDecimal(item.amount),
    currency: item.currency,
    accountName: item.fromAccount.name,
    accountIcon: item.fromAccount.icon,
    note: item.note,
  }));
}
