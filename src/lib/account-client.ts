/**
 * Lớp dữ liệu phía client cho màn hình Account — gọi `GET /api/accounts/summary`
 * và `POST /api/accounts` (`docs/api-spec/account.yaml`). Server đã quy đổi
 * `totalBalance`/`subtotal` về một loại tiền tệ nên không cần tính tay ở client.
 */

import { apiFetch, fromDecimal, toDecimal } from "./api/client";
import type { AccountKind, AccountItem, AccountOverview } from "./account-types";

interface AccountDto {
  id: string;
  name: string;
  type: string;
  currency: string;
  currentBalance: string;
  description: string | null;
}

interface AccountGroupDto {
  type: string;
  label: string;
  accounts: AccountDto[];
}

interface AccountSummaryResponse {
  data: {
    totalBalance: string;
    currency: string;
    groups: AccountGroupDto[];
  };
}

interface AccountResponse {
  data: AccountDto;
}

function toAccountItem(dto: AccountDto): AccountItem {
  return {
    id: dto.id,
    name: dto.name,
    // AccountType của backend có nhiều giá trị hơn AccountKind của frontend
    // (SAVING_ACCOUNT, IC_CARD, INVESTMENT, OTHER nằm ngoài phạm vi màn này) —
    // vẫn hiển thị đúng type gốc, accountKindLabel() đã có fallback an toàn.
    kind: dto.type as AccountKind,
    currency: dto.currency,
    balance: fromDecimal(dto.currentBalance),
    description: dto.description ?? "",
  };
}

export async function fetchAccountOverview(): Promise<AccountOverview> {
  const { data } = await apiFetch<AccountSummaryResponse>("/accounts/summary");
  return {
    totalBalance: fromDecimal(data.totalBalance),
    currency: data.currency,
    groups: data.groups
      .filter((group) => group.accounts.length > 0)
      .map((group) => ({
        id: `group-${group.type.toLowerCase()}`,
        title: group.label,
        accounts: group.accounts.map(toAccountItem),
      })),
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
  const { data } = await apiFetch<AccountResponse>("/accounts", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      type: input.kind,
      initialBalance: toDecimal(input.balance),
      currency: input.currency,
      description: input.description || null,
    }),
  });
  return toAccountItem(data);
}
