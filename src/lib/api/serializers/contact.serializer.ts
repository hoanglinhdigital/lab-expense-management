/** Map record Prisma → schema `Contact` của `contact.yaml`. */

export interface ContactTotals {
  totalLend: string;
  totalBorrow: string;
  transactionCount: number;
}

export interface ContactDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  totalLend?: string;
  totalBorrow?: string;
  transactionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactRecord {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const contactSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function toContactDto(
  contact: ContactRecord,
  totals?: ContactTotals,
): ContactDto {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    note: contact.note,
    ...(totals ?? {}),
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

/** Thông tin rút gọn dùng trong response của transaction. */
export interface ContactRefDto {
  id: string;
  name: string;
}

export const contactRefSelect = { id: true, name: true } as const;
