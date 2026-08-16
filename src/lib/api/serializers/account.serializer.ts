/** Map record Prisma → schema `Account` của `account.yaml`. */

import type { AccountType } from "@/generated/prisma/enums";
import { toAmountString, type Decimal } from "@/lib/domain/decimal";

export interface AccountDto {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: string;
  currentBalance: string;
  currency: string;
  icon: string | null;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountRecord {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: Decimal;
  currency: string;
  icon: string | null;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * `currentBalance` luôn nhận từ ngoài (kết quả `computeBalances`) thay vì đọc cột
 * cache trong DB — cột cache chỉ để tra nhanh, giá trị trong response phải là
 * giá trị tính lại từ giao dịch.
 */
export function toAccountDto(
  account: AccountRecord,
  currentBalance: Decimal,
): AccountDto {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    initialBalance: toAmountString(account.initialBalance),
    currentBalance: toAmountString(currentBalance),
    currency: account.currency,
    icon: account.icon,
    description: account.description,
    isDefault: account.isDefault,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

/** Thông tin rút gọn dùng trong response của transaction. */
export interface AccountRefDto {
  id: string;
  name: string;
  currency: string;
  icon: string | null;
}

export const accountRefSelect = {
  id: true,
  name: true,
  currency: true,
  icon: true,
} as const;
