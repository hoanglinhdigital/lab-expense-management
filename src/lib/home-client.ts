/**
 * Lớp dữ liệu phía client cho màn hình Home (dashboard).
 *
 * Gọi song song 6 endpoint độc lập như `docs/api-spec/report.yaml` mô tả:
 * `total-balance`, `expense-vs-income`, `expense-by-category`, `expense-analysis`,
 * `money-lend-borrow` và `GET /utility/exchange-rate`, cộng `GET /auth/me` để lấy
 * tên user. Một lời gọi lỗi thì `Promise.all` reject ngay với lỗi đó — khớp hành
 * vi hiện tại của `HomeScreen` (toàn màn hiện `FormAlert` khi tải lỗi).
 */

import { apiFetch, buildQuery, fromDecimal } from "./api/client";
import { getPeriodOption } from "./home-types";
import type { HomeOverview, LoanItem, PeriodRange } from "./home-types";

interface MeResponse {
  data: { name: string };
}

interface TotalBalanceResponse {
  data: { total: string; currency: string };
}

interface ExpenseVsIncomeResponse {
  data: { income: string; expense: string };
}

interface CategoryBreakdownResponse {
  data: { categoryId: string | null; name: string; amount: string }[];
}

interface ExchangeRateResponse {
  data: { code: string; symbol: string; region: string | null; rate: string }[];
}

interface MonthlySummaryResponse {
  data: { month: string; expense: string }[];
}

interface LoanDto {
  id: string;
  kind: "LEND" | "BORROW";
  note: string | null;
  amount: string;
  date: string;
}

interface MoneyLendBorrowResponse {
  data: LoanDto[];
}

function toLoanItem(dto: LoanDto): LoanItem {
  return {
    id: dto.id,
    kind: dto.kind,
    note: dto.note ?? "",
    amount: fromDecimal(dto.amount),
    date: dto.date.slice(0, 10),
  };
}

export async function fetchHomeOverview(
  range: PeriodRange,
): Promise<HomeOverview> {
  const { months } = getPeriodOption(range);

  const [me, totalBalance, expenseVsIncome, expenseByCategory, exchangeRates, monthly, loans] =
    await Promise.all([
      apiFetch<MeResponse>("/auth/me"),
      apiFetch<TotalBalanceResponse>("/report/total-balance"),
      apiFetch<ExpenseVsIncomeResponse>("/report/expense-vs-income"),
      apiFetch<CategoryBreakdownResponse>(
        `/report/expense-by-category${buildQuery({ flow: "EXPENSE" })}`,
      ),
      apiFetch<ExchangeRateResponse>("/utility/exchange-rate"),
      apiFetch<MonthlySummaryResponse>(
        `/report/expense-analysis${buildQuery({ months })}`,
      ),
      apiFetch<MoneyLendBorrowResponse>(
        `/report/money-lend-borrow${buildQuery({ pageSize: 5 })}`,
      ),
    ]);

  return {
    user: { name: me.data.name },
    balance: {
      total: fromDecimal(totalBalance.data.total),
      currency: totalBalance.data.currency,
    },
    flow: {
      income: fromDecimal(expenseVsIncome.data.income),
      expense: fromDecimal(expenseVsIncome.data.expense),
      currency: totalBalance.data.currency,
    },
    expenseByCategory: expenseByCategory.data.map((item) => ({
      id: item.categoryId ?? "uncategorized",
      name: item.name,
      amount: fromDecimal(item.amount),
    })),
    exchangeRates: exchangeRates.data.map((item) => ({
      code: item.code,
      symbol: item.symbol,
      region: item.region ?? "",
      rate: fromDecimal(item.rate),
    })),
    monthly: monthly.data.map((item) => ({
      month: item.month,
      amount: fromDecimal(item.expense),
    })),
    loans: loans.data.map(toLoanItem),
  };
}
