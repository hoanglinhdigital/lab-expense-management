"use client";

/**
 * Header màn Setting.
 *
 * Ngoại lệ bảng màu đã được user duyệt: giữ tông cam của mockup
 * (`docs/mockup/setting/setting-1.png`) thay vì emerald dùng chung, xem
 * `plans/frontend/setting.md` mục 2.1.
 */

import { Gem, Settings } from "lucide-react";
import { formatDate } from "@/lib/format";
import { profileInitial, type UserProfile } from "@/lib/setting-types";

interface SettingHeaderProps {
  profile: UserProfile;
  onOpenSettings: () => void;
}

export default function SettingHeader({
  profile,
  onOpenSettings,
}: SettingHeaderProps) {
  return (
    <header className="bg-orange-500 px-4 pb-6 pt-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/25 text-xl font-semibold text-white"
          >
            {profileInitial(profile.displayName)}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm text-white">Hello!</p>
            <h1 className="truncate text-xl font-semibold text-white">
              {profile.displayName}
            </h1>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Cài đặt"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/20"
          >
            <Settings size={24} aria-hidden />
          </button>
        </div>

        {profile.membershipLabel ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-3 py-3 shadow-sm">
            <Gem size={20} className="shrink-0 text-blue-600" aria-hidden />
            {/* text-sm ở mobile để "Premium Member" không bị cắt ở 375px. */}
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 sm:text-base">
              {profile.membershipLabel}
            </p>
            <p className="shrink-0 text-xs tabular-nums text-slate-500">
              valid until {formatDate(profile.validUntil)}
            </p>
          </div>
        ) : null}
      </div>
    </header>
  );
}
