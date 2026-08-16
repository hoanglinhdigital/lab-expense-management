/** Nhãn hiển thị dùng chung cho response — giữ ở một chỗ để không lệch giữa các API. */

import { AccountType } from "@/generated/prisma/enums";

/** Nhãn nhóm nguồn tiền trong `GET /accounts/summary`. Thứ tự khai báo = thứ tự hiển thị. */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.CASH]: "Tiền mặt",
  [AccountType.BANK_ACCOUNT]: "Tài khoản ngân hàng",
  [AccountType.SAVING_ACCOUNT]: "Tài khoản tiết kiệm",
  [AccountType.E_WALLET]: "Ví điện tử",
  [AccountType.CREDIT_CARD]: "Thẻ tín dụng",
  [AccountType.IC_CARD]: "Thẻ IC",
  [AccountType.INVESTMENT]: "Đầu tư",
  [AccountType.OTHER]: "Khác",
};

export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  AccountType.CASH,
  AccountType.BANK_ACCOUNT,
  AccountType.SAVING_ACCOUNT,
  AccountType.E_WALLET,
  AccountType.CREDIT_CARD,
  AccountType.IC_CARD,
  AccountType.INVESTMENT,
  AccountType.OTHER,
];

/** 4 kỳ cố định của `GET /report/overview`, đúng thứ tự spec yêu cầu. */
export const REPORT_PERIOD_IDS = [
  "today",
  "this_week",
  "this_month",
  "this_year",
] as const;

export type ReportPeriodId = (typeof REPORT_PERIOD_IDS)[number];

export const REPORT_PERIOD_LABELS: Record<ReportPeriodId, string> = {
  today: "Hôm nay",
  this_week: "Tuần này",
  this_month: "Tháng này",
  this_year: "Năm nay",
};

/** Nhóm giao dịch không gắn danh mục trong báo cáo theo danh mục. */
export const UNCATEGORIZED_LABEL = "Chưa phân loại";

export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
