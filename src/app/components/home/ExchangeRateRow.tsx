import { formatCurrency } from "@/lib/format";
import type { ExchangeRate } from "@/lib/home-types";

interface ExchangeRateRowProps {
  rate: ExchangeRate;
  /** Tiền tệ gốc của user — vế phải của "1 USD ≈ ...". */
  baseCurrency: string;
}

export default function ExchangeRateRow({
  rate,
  baseCurrency,
}: ExchangeRateRowProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span aria-hidden className="w-10 shrink-0 text-center">
        <span className="block text-lg font-medium text-slate-800">
          {rate.symbol}
        </span>
        <span className="block text-xs text-slate-500">{rate.code}</span>
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-slate-800">
        1 {rate.code} ≈{" "}
        <span className="font-medium tabular-nums">
          {formatCurrency(rate.rate)}
        </span>{" "}
        {baseCurrency}
      </p>
      <span className="shrink-0 text-sm font-medium text-slate-500">
        {rate.region}
      </span>
    </li>
  );
}
