"use client";

import type { SettingAction } from "@/lib/setting-types";

interface SettingTileGroupProps {
  title: string;
  actions: SettingAction[];
  /** Mockup chưa có màn đích cho các ô này — nơi gọi tạm báo "đang phát triển". */
  onSelect: (action: SettingAction) => void;
}

export default function SettingTileGroup({
  title,
  actions,
  onSelect,
}: SettingTileGroupProps) {
  return (
    <section>
      <h2 className="text-base font-medium text-slate-800">{title}</h2>

      <div className="mt-2 grid grid-cols-4 gap-1 rounded-2xl bg-white p-2 shadow-sm">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onSelect(action)}
              className="flex min-h-24 flex-col items-center justify-start gap-2 rounded-xl px-1 py-3 hover:bg-slate-50"
            >
              <Icon size={24} className="shrink-0 text-blue-600" aria-hidden />
              <span className="text-center text-xs text-slate-800">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
