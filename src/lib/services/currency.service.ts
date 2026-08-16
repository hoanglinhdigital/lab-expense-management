/**
 * Tiền tệ và tỷ giá — dữ liệu tham chiếu dùng chung mọi user (`docs/api-spec/currency.yaml`).
 *
 * Quy ước `rate`: số đơn vị `base` đổi được từ **1 đơn vị** `code`.
 * `base=VND`, `code=USD`, `rate=25400` ⇒ 1 USD = 25 400 VND.
 */

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { currencyNotSupported } from "@/lib/api/errors";
import { buildMeta, toSkipTake, type PaginationMeta } from "@/lib/api/pagination";
import { toDecimal } from "@/lib/domain/decimal";

/** Đồng tiền trung gian để suy tỷ giá bắc cầu khi không có cặp trực tiếp. */
const PIVOT_CURRENCY = "VND";

export interface CurrencyDto {
  code: string;
  name: string;
  symbol: string;
  decimalDigits: number;
  region: string | null;
}

export interface ExchangeRateDto {
  code: string;
  base: string;
  symbol: string;
  region: string | null;
  rate: string;
  updatedAt: string;
}

/** Tỷ giá đã chuẩn hoá: `rate` đơn vị `base` cho 1 đơn vị `code`. */
export interface RateEntry {
  rate: Prisma.Decimal;
  updatedAt: Date;
}

export type RateMap = Map<string, RateEntry>;

export async function listSupportedCodes(): Promise<Set<string>> {
  const currencies = await prisma.currency.findMany({ select: { code: true } });
  return new Set(currencies.map((currency) => currency.code));
}

/** Ném `404 CURRENCY_NOT_SUPPORTED` nếu mã không có trong bảng `Currency`. */
export async function assertCurrencySupported(
  code: string,
  field = "currency",
): Promise<string> {
  const currency = await prisma.currency.findUnique({
    where: { code },
    select: { code: true },
  });

  if (!currency) throw currencyNotSupported({ [field]: code });
  return currency.code;
}

export async function listCurrencies(input: {
  page: number;
  pageSize: number;
  keyword?: string;
}): Promise<{ data: CurrencyDto[]; meta: PaginationMeta }> {
  const where: Prisma.CurrencyWhereInput = input.keyword
    ? {
        OR: [
          { code: { contains: input.keyword } },
          { name: { contains: input.keyword } },
        ],
      }
    : {};

  const [total, currencies] = await Promise.all([
    prisma.currency.count({ where }),
    prisma.currency.findMany({
      where,
      // Thứ tự cố định để sheet chọn tiền tệ luôn hiển thị như nhau.
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      ...toSkipTake(input),
    }),
  ]);

  return {
    data: currencies.map((currency) => ({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimalDigits: currency.decimalDigits,
      region: currency.region,
    })),
    meta: buildMeta(input, total),
  };
}

/**
 * Bảng tỷ giá quy về `base` cho mọi tiền tệ được hỗ trợ.
 *
 * Ưu tiên cặp `(base, code)` có sẵn trong DB; thiếu thì suy bắc cầu qua VND:
 * `rate(base→code) = vndPerUnit(code) / vndPerUnit(base)`.
 */
export async function loadRateMap(base: string): Promise<RateMap> {
  const [direct, pivot] = await Promise.all([
    prisma.exchangeRate.findMany({ where: { base } }),
    prisma.exchangeRate.findMany({ where: { base: PIVOT_CURRENCY } }),
  ]);

  const rates: RateMap = new Map();
  rates.set(base, { rate: new Prisma.Decimal(1), updatedAt: new Date(0) });

  for (const row of direct) {
    rates.set(row.code, { rate: toDecimal(row.rate), updatedAt: row.updatedAt });
  }

  const vndPerUnit = new Map<string, RateEntry>([
    [PIVOT_CURRENCY, { rate: new Prisma.Decimal(1), updatedAt: new Date(0) }],
  ]);
  for (const row of pivot) {
    vndPerUnit.set(row.code, { rate: toDecimal(row.rate), updatedAt: row.updatedAt });
  }

  const vndPerBase = vndPerUnit.get(base);
  if (vndPerBase && !vndPerBase.rate.isZero()) {
    for (const [code, entry] of vndPerUnit) {
      if (rates.has(code)) continue;
      rates.set(code, {
        rate: entry.rate.div(vndPerBase.rate),
        updatedAt:
          entry.updatedAt > vndPerBase.updatedAt
            ? entry.updatedAt
            : vndPerBase.updatedAt,
      });
    }
  }

  return rates;
}

export async function listExchangeRates(input: {
  page: number;
  pageSize: number;
  base: string;
  codes?: string[];
}): Promise<{
  data: ExchangeRateDto[];
  meta: PaginationMeta & { base: string };
}> {
  await assertCurrencySupported(input.base, "base");

  const currencies = await prisma.currency.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  const supported = new Map(currencies.map((currency) => [currency.code, currency]));

  let codes: string[];
  if (input.codes && input.codes.length > 0) {
    const unknown = input.codes.filter((code) => !supported.has(code));
    if (unknown.length > 0) {
      throw currencyNotSupported({ codes: unknown.join(",") });
    }
    // Giữ thứ tự cố định của bảng Currency, khử trùng lặp, loại chính `base`.
    const requested = new Set(input.codes);
    codes = currencies
      .map((currency) => currency.code)
      .filter((code) => requested.has(code) && code !== input.base);
  } else {
    codes = currencies
      .map((currency) => currency.code)
      .filter((code) => code !== input.base);
  }

  const rates = await loadRateMap(input.base);

  const all: ExchangeRateDto[] = [];
  for (const code of codes) {
    const entry = rates.get(code);
    if (!entry) continue; // Chưa có tỷ giá thì bỏ qua, không phải lỗi.

    const currency = supported.get(code)!;
    all.push({
      code,
      base: input.base,
      symbol: currency.symbol,
      region: currency.region,
      rate: entry.rate.toDecimalPlaces(8).toString(),
      updatedAt: entry.updatedAt.toISOString(),
    });
  }

  const { skip, take } = toSkipTake(input);

  return {
    data: all.slice(skip, skip + take),
    meta: { ...buildMeta(input, all.length), base: input.base },
  };
}
