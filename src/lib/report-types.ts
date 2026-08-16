/**
 * Kiểu dữ liệu cho màn Report và màn chi tiết "Expense vs Income".
 *
 * Dùng lại `FlowSummary` của Home để hai màn chung một "hợp đồng" thu/chi —
 * nhờ vậy `home/IncomeExpenseBars` cắm thẳng vào card của Report được.
 */

import {
  CircleUserRound,
  ListOrdered,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FlowSummary } from "./home-types";

/** Bảng cân đối: tài sản − nợ = giá trị ròng. */
export interface FinancialStatement {
  netWorth: number;
  assets: number;
  liabilities: number;
  currency: string;
}

export interface ReportOverview {
  statement: FinancialStatement;
  flow: FlowSummary;
}

/** Tab kỳ của màn chi tiết. */
export type PeriodTab = "CURRENT" | "MONTH" | "QUARTER" | "YEAR" | "CUSTOM";

export interface PeriodTabOption {
  value: PeriodTab;
  label: string;
}

/** Thứ tự trong mảng = thứ tự hiển thị từ trái sang phải. */
export const PERIOD_TABS: PeriodTabOption[] = [
  { value: "CURRENT", label: "Current" },
  { value: "MONTH", label: "Month" },
  { value: "QUARTER", label: "Quarter" },
  { value: "YEAR", label: "Year" },
  { value: "CUSTOM", label: "Custom" },
];

/** Một dòng kỳ (Today, This week...). `net` tính khi render = income − expense. */
export interface PeriodFlow {
  id: string;
  label: string;
  income: number;
  expense: number;
}

export interface FlowDetail {
  /** Phạm vi dữ liệu hiển thị cạnh icon lịch, ví dụ "In 2026". */
  scopeLabel: string;
  currency: string;
  periods: PeriodFlow[];
}

/** Một ô trong lưới lối tắt 2×2 của màn Report. */
export interface ReportShortcut {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const REPORT_SHORTCUTS: ReportShortcut[] = [
  { id: "expense-analysis", label: "Expense analysis", icon: TrendingUp },
  { id: "income-analysis", label: "Income analysis", icon: TrendingDown },
  { id: "loans", label: "Money lent/borrowed", icon: ListOrdered },
  { id: "payer-payee", label: "Payer/Payee", icon: CircleUserRound },
];
