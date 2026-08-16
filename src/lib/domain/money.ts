/**
 * Quy đổi tiền tệ cho báo cáo.
 *
 * Nguyên tắc: gom số tiền theo currency **gốc** trước, quy đổi một lần cho cả
 * nhóm rồi mới cộng — quy đổi từng dòng sẽ tích luỹ sai số làm tròn.
 */

import { currencyNotSupported } from "@/lib/api/errors";
import { toDecimal, ZERO, type Decimal } from "./decimal";
import { loadRateMap, type RateMap } from "@/lib/services/currency.service";

export type { RateMap };

/** Nạp bảng tỷ giá quy về `target`, dùng chung cho cả một request báo cáo. */
export function loadRates(target: string): Promise<RateMap> {
  return loadRateMap(target);
}

/**
 * Đổi `amount` từ `from` sang `target` (chính là `base` của `rates`).
 *
 * `rates.get(from).rate` = số đơn vị `target` cho 1 đơn vị `from`, nên phép đổi
 * chỉ là một phép nhân.
 */
export function convert(
  amount: Decimal,
  from: string,
  target: string,
  rates: RateMap,
): Decimal {
  if (from === target) return amount;

  const entry = rates.get(from);
  if (!entry) throw currencyNotSupported({ currency: from });

  return amount.times(entry.rate);
}

/** Cộng dồn nhiều khoản tiền ở các currency khác nhau về một currency đích. */
export function sumConverted(
  items: { amount: Decimal | null | undefined; currency: string }[],
  target: string,
  rates: RateMap,
): Decimal {
  const byCurrency = new Map<string, Decimal>();

  for (const item of items) {
    const current = byCurrency.get(item.currency) ?? ZERO;
    byCurrency.set(item.currency, current.add(toDecimal(item.amount)));
  }

  let total = ZERO;
  for (const [currency, amount] of byCurrency) {
    total = total.add(convert(amount, currency, target, rates));
  }

  return total;
}
