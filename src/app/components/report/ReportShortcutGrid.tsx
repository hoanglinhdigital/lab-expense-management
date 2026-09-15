"use client";

import Link from "next/link";
import { REPORT_SHORTCUTS } from "@/lib/report-types";

interface ReportShortcutGridProps {
  /** Ô chưa có route đích (`href`) gọi hàm này để báo "đang phát triển". */
  onSelect: (label: string) => void;
}

const CARD_CLASS =
  "flex min-h-24 flex-col items-start justify-center gap-2 rounded-2xl bg-white p-4 text-left shadow-sm hover:bg-slate-50";

export default function ReportShortcutGrid({
  onSelect,
}: ReportShortcutGridProps) {
  return (
    <section className="grid grid-cols-2 gap-3">
      {REPORT_SHORTCUTS.map((shortcut) => {
        const Icon = shortcut.icon;
        const content = (
          <>
            <Icon size={24} className="text-emerald-600" aria-hidden />
            <span className="text-sm text-slate-800">{shortcut.label}</span>
          </>
        );

        if (shortcut.href) {
          return (
            <Link key={shortcut.id} href={shortcut.href} className={CARD_CLASS}>
              {content}
            </Link>
          );
        }

        return (
          <button
            key={shortcut.id}
            type="button"
            onClick={() => onSelect(shortcut.label)}
            className={CARD_CLASS}
          >
            {content}
          </button>
        );
      })}
    </section>
  );
}
