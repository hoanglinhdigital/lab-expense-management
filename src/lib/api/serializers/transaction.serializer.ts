/** Map record Prisma → schema `Transaction` của `transaction.yaml`. */

import type { TransactionType } from "@/generated/prisma/enums";
import { toAmountString, type Decimal } from "@/lib/domain/decimal";
import {
  accountRefSelect,
  type AccountRefDto,
} from "./account.serializer";
import {
  categoryRefSelect,
  type CategoryRefDto,
} from "./category.serializer";
import { contactRefSelect, type ContactRefDto } from "./contact.serializer";

export interface TransactionDto {
  id: string;
  type: TransactionType;
  amount: string;
  receiveAmount: string | null;
  currency: string;
  date: string;
  note: string | null;
  fromAccount: AccountRefDto;
  toAccount: AccountRefDto | null;
  category: CategoryRefDto | null;
  contact: ContactRefDto | null;
  createdAt: string;
  updatedAt: string;
}

/** Join sẵn account/category/contact để danh sách không phải gọi thêm API. */
export const transactionSelect = {
  id: true,
  type: true,
  amount: true,
  receiveAmount: true,
  date: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  fromAccount: { select: accountRefSelect },
  toAccount: { select: accountRefSelect },
  category: { select: categoryRefSelect },
  contact: { select: contactRefSelect },
} as const;

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  amount: Decimal;
  receiveAmount: Decimal | null;
  date: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  fromAccount: AccountRefDto;
  toAccount: AccountRefDto | null;
  category: CategoryRefDto | null;
  contact: ContactRefDto | null;
}

export function toTransactionDto(
  transaction: TransactionRecord,
): TransactionDto {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: toAmountString(transaction.amount),
    receiveAmount:
      transaction.receiveAmount === null
        ? null
        : toAmountString(transaction.receiveAmount),
    // Số tiền `amount` luôn tính theo tiền tệ của tài khoản nguồn.
    currency: transaction.fromAccount.currency,
    date: transaction.date.toISOString(),
    note: transaction.note,
    fromAccount: transaction.fromAccount,
    toAccount: transaction.toAccount,
    category: transaction.category,
    contact: transaction.contact,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}
