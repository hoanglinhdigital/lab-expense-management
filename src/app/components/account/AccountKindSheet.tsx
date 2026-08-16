"use client";

import { Check } from "lucide-react";
import BottomSheet from "../BottomSheet";
import { ACCOUNT_KINDS, type AccountKind } from "@/lib/account-types";

interface AccountKindSheetProps {
  value: AccountKind;
  onSelect: (kind: AccountKind) => void;
  onClose: () => void;
}

export default function AccountKindSheet({
  value,
  onSelect,
  onClose,
}: AccountKindSheetProps) {
  return (
    <BottomSheet title="Account type" onClose={onClose}>
      <ul>
        {ACCOUNT_KINDS.map((kind) => {
          const selected = kind.value === value;
          return (
            <li key={kind.value}>
              <button
                type="button"
                onClick={() => onSelect(kind.value)}
                aria-current={selected}
                className="flex min-h-11 w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
              >
                <span
                  className={`flex-1 text-sm ${
                    selected ? "font-medium text-emerald-600" : "text-slate-800"
                  }`}
                >
                  {kind.label}
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
