/**
 * Tiện ích quanh `Prisma.Decimal`.
 *
 * Mọi số tiền trong response đều là **chuỗi** 2 chữ số thập phân (spec dùng
 * `DecimalAmount`/`PositiveAmount` kiểu string) để tránh sai số floating point
 * khi đi qua JSON.
 */

import { Prisma } from "@/generated/prisma/client";

export type Decimal = Prisma.Decimal;

/** Kiểu đầu vào chấp nhận được cho mọi hàm ở đây. */
export type DecimalInput = string | number | Prisma.Decimal;

export const ZERO = new Prisma.Decimal(0);

export function toDecimal(value: DecimalInput | null | undefined): Decimal {
  if (value === null || value === undefined) return ZERO;
  return new Prisma.Decimal(value);
}

/** Chuỗi 2 chữ số thập phân — khuôn dạng dùng ở mọi response. */
export function toAmountString(
  value: DecimalInput | null | undefined,
): string {
  return toDecimal(value).toFixed(2);
}

export function sumDecimals(
  values: (DecimalInput | null | undefined)[],
): Decimal {
  return values.reduce<Decimal>((total, value) => total.add(toDecimal(value)), ZERO);
}

export function isNegative(value: Decimal): boolean {
  return value.lessThan(0);
}

/** Tỷ trọng phần trăm, làm tròn 2 chữ số thập phân; mẫu số 0 trả về 0. */
export function toPercentage(part: Decimal, total: Decimal): number {
  if (total.isZero()) return 0;
  return Number(part.div(total).times(100).toFixed(2));
}
