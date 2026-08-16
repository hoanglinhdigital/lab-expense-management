"use client";

import type { SettingMenuItem } from "@/lib/setting-types";

interface SettingMenuRowProps {
  item: SettingMenuItem;
  onSelect: (item: SettingMenuItem) => void;
}

/** Đoạn "5 stars" trong dòng phụ được tô cam đúng như mockup. */
const HIGHLIGHT = "5 stars";

function renderDescription(description: string) {
  const index = description.indexOf(HIGHLIGHT);
  if (index === -1) return description;

  return (
    <>
      {description.slice(0, index)}
      <span className="font-medium text-orange-500">{HIGHLIGHT}</span>
      {description.slice(index + HIGHLIGHT.length)}
    </>
  );
}

export default function SettingMenuRow({ item, onSelect }: SettingMenuRowProps) {
  const Icon = item.icon;
  const isDanger = item.tone === "danger";

  return (
    <li className="border-t border-slate-200 first:border-t-0">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <Icon
          size={16}
          className={`shrink-0 ${isDanger ? "text-rose-600" : "text-blue-600"}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm ${
              isDanger ? "text-rose-600" : "text-slate-800"
            }`}
          >
            {item.label}
          </span>
          {item.description ? (
            <span className="mt-0.5 block text-xs text-slate-500">
              {renderDescription(item.description)}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
