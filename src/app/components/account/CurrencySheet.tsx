"use client";

import { Check } from "lucide-react";
import BottomSheet from "../BottomSheet";
import { CURRENCIES } from "@/lib/account-types";

interface CurrencySheetProps {
  value: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export default function CurrencySheet({
  value,
  onSelect,
  onClose,
}: CurrencySheetProps) {
  return (
    <BottomSheet title="Currency" onClose={onClose}>
      <ul>
        {CURRENCIES.map((currency) => {
          const selected = currency.code === value;
          return (
            <li key={currency.code}>
              <button
                type="button"
                onClick={() => onSelect(currency.code)}
                aria-current={selected}
                className="flex min-h-11 w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
              >
                <span
                  className={`flex-1 text-sm ${
                    selected ? "font-medium text-emerald-600" : "text-slate-800"
                  }`}
                >
                  {currency.code} ({currency.symbol})
                </span>
                {selected ? (
                  <Check size={16} className="shrink-0 text-emerald-600" aria-hidden />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
