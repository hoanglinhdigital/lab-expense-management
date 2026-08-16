"use client";

import { Check } from "lucide-react";
import FullScreenPanel from "../FullScreenPanel";
import type { CategoryOption } from "@/lib/record-types";

interface ParentCategoryPanelProps {
  /** Chỉ gồm các category cha (parentId === null) cùng loại. */
  parents: CategoryOption[];
  value: string | null;
  onSelect: (parentId: string | null) => void;
  onBack: () => void;
}

export default function ParentCategoryPanel({
  parents,
  value,
  onSelect,
  onBack,
}: ParentCategoryPanelProps) {
  return (
    <FullScreenPanel title="Parent Category" onBack={onBack}>
      <ul className="bg-white">
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`flex min-h-11 w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left ${
              value === null ? "bg-emerald-50" : ""
            }`}
          >
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500"
            >
              --
            </span>
            <span
              className={`flex-1 text-sm ${
                value === null ? "font-medium text-emerald-600" : "text-slate-800"
              }`}
            >
              (No item selected)
            </span>
            {value === null ? (
              <Check size={16} className="shrink-0 text-emerald-600" aria-hidden />
            ) : null}
          </button>
        </li>

        {parents.map((parent) => {
          const selected = parent.id === value;
          return (
            <li key={parent.id}>
              <button
                type="button"
                onClick={() => onSelect(parent.id)}
                className={`flex min-h-11 w-full items-center gap-3 border-b border-slate-200 px-4 py-3 text-left ${
                  selected ? "bg-emerald-50" : ""
                }`}
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl"
                >
                  {parent.icon}
                </span>
                <span
                  className={`flex-1 truncate text-sm ${
                    selected ? "font-medium text-emerald-600" : "text-slate-800"
                  }`}
                >
                  {parent.name}
                </span>
                {selected ? (
                  <Check size={16} className="shrink-0 text-emerald-600" aria-hidden />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </FullScreenPanel>
  );
}
