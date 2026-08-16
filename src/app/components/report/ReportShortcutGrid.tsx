"use client";

import { REPORT_SHORTCUTS } from "@/lib/report-types";

interface ReportShortcutGridProps {
  /** Mockup chưa có màn đích cho 4 ô này — tạm báo "đang phát triển". */
  onSelect: (label: string) => void;
}

export default function ReportShortcutGrid({
  onSelect,
}: ReportShortcutGridProps) {
  return (
    <section className="grid grid-cols-2 gap-3">
      {REPORT_SHORTCUTS.map((shortcut) => {
        const Icon = shortcut.icon;
        return (
          <button
            key={shortcut.id}
            type="button"
            onClick={() => onSelect(shortcut.label)}
            className="flex min-h-24 flex-col items-start justify-center gap-2 rounded-2xl bg-white p-4 text-left shadow-sm hover:bg-slate-50"
          >
            <Icon size={24} className="text-emerald-600" aria-hidden />
            <span className="text-sm text-slate-800">{shortcut.label}</span>
          </button>
        );
      })}
    </section>
  );
}
