"use client";

import SettingMenuRow from "./SettingMenuRow";
import { SETTING_MENU, type SettingMenuItem } from "@/lib/setting-types";

interface SettingMenuListProps {
  onSelect: (item: SettingMenuItem) => void;
}

export default function SettingMenuList({ onSelect }: SettingMenuListProps) {
  return (
    <nav aria-label="Tuỳ chọn khác">
      <ul className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {SETTING_MENU.map((item) => (
          <SettingMenuRow key={item.id} item={item} onSelect={onSelect} />
        ))}
      </ul>
    </nav>
  );
}
