/** Đối tượng vay / cho mượn (`docs/api-spec/contact.yaml`). */

import { Prisma } from "@/generated/prisma/client";
import { TransactionType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { conflict, contactNotFound } from "@/lib/api/errors";
import {
  buildMeta,
  toSkipTake,
  type PaginationMeta,
} from "@/lib/api/pagination";
import {
  contactSelect,
  toContactDto,
  type ContactDto,
  type ContactRecord,
  type ContactTotals,
} from "@/lib/api/serializers/contact.serializer";
import { toAmountString, toDecimal, ZERO } from "@/lib/domain/decimal";
import { convert, loadRates } from "@/lib/domain/money";
import type {
  CreateContactInput,
  ListContactsQuery,
  UpdateContactInput,
} from "@/lib/api/schemas/contact.schema";

/**
 * Tổng công nợ của nhiều contact bằng một `groupBy`.
 *
 * Số tiền nằm ở tiền tệ của `fromAccount` nên phải gom theo `[contactId, type,
 * fromAccountId]` rồi quy đổi về `targetCurrency` trước khi cộng — cộng thô các
 * currency khác nhau sẽ ra số vô nghĩa.
 */
async function loadTotals(
  userId: string,
  contactIds: string[],
  targetCurrency: string,
): Promise<Map<string, ContactTotals>> {
  const totals = new Map<string, ContactTotals>();
  if (contactIds.length === 0) return totals;

  const [rows, accounts, rates] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["contactId", "type", "fromAccountId"],
      where: {
        userId,
        isDeleted: false,
        contactId: { in: contactIds },
        type: { in: [TransactionType.LEND, TransactionType.BORROW] },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.account.findMany({
      where: { userId },
      select: { id: true, currency: true },
    }),
    loadRates(targetCurrency),
  ]);

  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));

  const accumulator = new Map<
    string,
    { lend: Prisma.Decimal; borrow: Prisma.Decimal; count: number }
  >();

  for (const row of rows) {
    if (!row.contactId) continue;

    const entry = accumulator.get(row.contactId) ?? {
      lend: ZERO,
      borrow: ZERO,
      count: 0,
    };

    const currency = currencyOf.get(row.fromAccountId) ?? targetCurrency;
    const amount = convert(
      toDecimal(row._sum.amount),
      currency,
      targetCurrency,
      rates,
    );

    if (row.type === TransactionType.LEND) entry.lend = entry.lend.add(amount);
    else entry.borrow = entry.borrow.add(amount);

    entry.count += row._count._all;
    accumulator.set(row.contactId, entry);
  }

  for (const contactId of contactIds) {
    const entry = accumulator.get(contactId);
    totals.set(contactId, {
      totalLend: toAmountString(entry?.lend ?? ZERO),
      totalBorrow: toAmountString(entry?.borrow ?? ZERO),
      transactionCount: entry?.count ?? 0,
    });
  }

  return totals;
}

export async function listContacts(
  userId: string,
  defaultCurrency: string,
  query: ListContactsQuery,
): Promise<{ data: ContactDto[]; meta: PaginationMeta }> {
  const where: Prisma.ContactWhereInput = {
    userId,
    isDeleted: false,
    ...(query.keyword
      ? {
          OR: [
            { name: { contains: query.keyword } },
            { phone: { contains: query.keyword } },
            { email: { contains: query.keyword } },
          ],
        }
      : {}),
  };

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      select: contactSelect,
      orderBy: toOrderBy(query.sort),
      ...toSkipTake(query),
    }),
  ]);

  // Danh sách chọn contact ở màn Record không cần tổng công nợ, nên chỉ tính
  // khi client yêu cầu tường minh.
  const totals = query.includeTotals
    ? await loadTotals(
        userId,
        contacts.map((contact) => contact.id),
        defaultCurrency,
      )
    : undefined;

  return {
    data: contacts.map((contact) =>
      toContactDto(contact, totals?.get(contact.id)),
    ),
    meta: buildMeta(query, total),
  };
}

function toOrderBy(
  sort: ListContactsQuery["sort"],
): Prisma.ContactOrderByWithRelationInput[] {
  switch (sort) {
    case "name_desc":
      return [{ name: "desc" }, { id: "asc" }];
    case "created_desc":
      return [{ createdAt: "desc" }, { id: "asc" }];
    case "created_asc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    default:
      return [{ name: "asc" }, { id: "asc" }];
  }
}

export async function getContact(
  userId: string,
  defaultCurrency: string,
  contactId: string,
): Promise<ContactDto> {
  const contact = await assertContactOwned(userId, contactId);
  const totals = await loadTotals(userId, [contactId], defaultCurrency);
  return toContactDto(contact, totals.get(contactId));
}

export async function createContact(
  userId: string,
  input: CreateContactInput,
): Promise<ContactDto> {
  await assertNameAvailable(userId, input.name);

  try {
    const contact = await prisma.contact.create({
      data: {
        userId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        note: input.note ?? null,
      },
      select: contactSelect,
    });

    return toContactDto(contact);
  } catch (error) {
    if (isUniqueViolation(error)) throw contactNameDuplicated(input.name);
    throw error;
  }
}

export async function updateContact(
  userId: string,
  defaultCurrency: string,
  contactId: string,
  input: UpdateContactInput,
): Promise<ContactDto> {
  const contact = await assertContactOwned(userId, contactId);

  if (input.name && input.name !== contact.name) {
    await assertNameAvailable(userId, input.name, contactId);
  }

  try {
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
    });
  } catch (error) {
    if (isUniqueViolation(error) && input.name) {
      throw contactNameDuplicated(input.name);
    }
    throw error;
  }

  return getContact(userId, defaultCurrency, contactId);
}

export async function deleteContact(
  userId: string,
  contactId: string,
): Promise<void> {
  await assertContactOwned(userId, contactId);

  const transactionCount = await prisma.transaction.count({
    where: { userId, isDeleted: false, contactId },
  });

  if (transactionCount > 0) {
    throw conflict(
      "CONTACT_HAS_TRANSACTIONS",
      "Không thể xoá đối tượng đang có giao dịch.",
      { transactionCount },
    );
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: { isDeleted: true },
  });
}

/** Dùng lại ở plan 05 khi validate `contactId` của giao dịch BORROW/LEND. */
export async function assertContactOwned(
  userId: string,
  contactId: string,
): Promise<ContactRecord> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId, isDeleted: false },
    select: contactSelect,
  });

  if (!contact) throw contactNotFound();
  return contact;
}

async function assertNameAvailable(
  userId: string,
  name: string,
  exceptId?: string,
): Promise<void> {
  const duplicated = await prisma.contact.findFirst({
    where: {
      userId,
      name,
      isDeleted: false,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });

  if (duplicated) throw contactNameDuplicated(name);
}

function contactNameDuplicated(name: string) {
  return conflict(
    "CONTACT_NAME_DUPLICATED",
    "Bạn đã có đối tượng cùng tên.",
    { name },
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
