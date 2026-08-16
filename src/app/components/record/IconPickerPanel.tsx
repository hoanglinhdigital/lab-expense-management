"use client";

import { Check } from "lucide-react";
import FullScreenPanel from "../FullScreenPanel";
import { CATEGORY_ICONS } from "@/lib/category-icons";

interface IconPickerPanelProps {
  value: string;
  onSelect: (icon: string) => void;
  onBack: () => void;
}

export default function IconPickerPanel({
  value,
  onSelect,
  onBack,
}: IconPickerPanelProps) {
  return (
    <FullScreenPanel title="Icon" onBack={onBack}>
      <div className="grid grid-cols-4 gap-3 p-4">
        {CATEGORY_ICONS.map((icon) => {
          const selected = icon === value;
          return (
            <button
              key={icon}
              type="button"
              onClick={() => onSelect(icon)}
              aria-pressed={selected}
              aria-label={`Chọn icon ${icon}`}
              className={`relative flex aspect-square min-h-11 items-center justify-center rounded-2xl border text-3xl ${
                selected
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-transparent bg-white"
              }`}
            >
              <span aria-hidden>{icon}</span>
              {selected ? (
                <Check
                  size={16}
                  className="absolute right-1 top-1 text-emerald-600"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </FullScreenPanel>
  );
}
