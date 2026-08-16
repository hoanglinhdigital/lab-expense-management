"use client";

import { Search, Settings2 } from "lucide-react";
import ExchangeRateRow from "./ExchangeRateRow";
import type { ExchangeRate } from "@/lib/home-types";

interface ExchangeRateCardProps {
  rates: ExchangeRate[];
  baseCurrency: string;
  /** Dùng chung cho nút bánh răng và nút Search — cả hai chưa có màn đích. */
  onComingSoon: () => void;
}

export default function ExchangeRateCard({
  rates,
  baseCurrency,
  onComingSoon,
}: ExchangeRateCardProps) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 text-base font-medium text-slate-800">
          Exchange rates utility
        </h2>
        <button
          type="button"
          onClick={onComingSoon}
          aria-label="Cài đặt tỷ giá"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          <Settings2 size={16} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onComingSoon}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-800 hover:bg-slate-50"
        >
          <Search size={16} aria-hidden />
          Search
        </button>
      </div>

      {rates.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
          Chưa có dữ liệu tỷ giá.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-2xl bg-white shadow-sm">
          {rates.map((rate) => (
            <ExchangeRateRow
              key={rate.code}
              rate={rate}
              baseCurrency={baseCurrency}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
