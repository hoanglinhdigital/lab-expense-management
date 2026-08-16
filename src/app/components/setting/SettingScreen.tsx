"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormAlert from "../FormAlert";
import LogoutConfirmDialog from "./LogoutConfirmDialog";
import SettingHeader from "./SettingHeader";
import SettingMenuList from "./SettingMenuList";
import SettingSkeleton from "./SettingSkeleton";
import SettingTileGroup from "./SettingTileGroup";
import { ApiClientError, isUnauthorized } from "@/lib/api/client";
import { fetchUserProfile, logout } from "@/lib/setting-client";
import {
  LOGOUT_ITEM_ID,
  SETTING_FEATURES,
  SETTING_UTILITIES,
  type UserProfile,
} from "@/lib/setting-types";

const COMING_SOON = "Tính năng đang phát triển, vui lòng quay lại sau.";
const LOAD_ERROR = "Không tải được thông tin tài khoản.";

export default function SettingScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  /** Tăng lên mỗi lần bấm "Thử lại" để chạy lại effect tải dữ liệu. */
  const [reloadToken, setReloadToken] = useState(0);

  // setState chỉ nằm trong callback của promise, không gọi đồng bộ trong thân
  // effect — tránh cascading render (rule `react-hooks/set-state-in-effect`).
  useEffect(() => {
    let cancelled = false;
    fetchUserProfile().then(
      (result) => {
        if (cancelled) return;
        setProfile(result);
        setError(null);
      },
      (fetchError: unknown) => {
        if (cancelled) return;
        if (isUnauthorized(fetchError)) {
          router.replace("/login");
          return;
        }
        setError(
          fetchError instanceof ApiClientError ? fetchError.message : LOAD_ERROR,
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloadToken, router]);

  function retry() {
    setError(null);
    setReloadToken((token) => token + 1);
  }

  async function confirmLogout() {
    await logout();
    router.replace("/login");
  }

  if (!profile) {
    if (error) {
      return (
        <div className="mx-auto w-full max-w-2xl p-4">
          <FormAlert tone="error" message={error} onRetry={retry} />
        </div>
      );
    }
    return <SettingSkeleton />;
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <SettingHeader
        profile={profile}
        onOpenSettings={() => setNotice(COMING_SOON)}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        {notice ? <FormAlert tone="info" message={notice} /> : null}

        <SettingTileGroup
          title="Feature"
          actions={SETTING_FEATURES}
          onSelect={() => setNotice(COMING_SOON)}
        />
        <SettingTileGroup
          title="Utilities"
          actions={SETTING_UTILITIES}
          onSelect={() => setNotice(COMING_SOON)}
        />

        <SettingMenuList
          onSelect={(item) => {
            if (item.id === LOGOUT_ITEM_ID) {
              setConfirmingLogout(true);
              return;
            }
            setNotice(COMING_SOON);
          }}
        />
      </div>

      {confirmingLogout ? (
        <LogoutConfirmDialog
          onCancel={() => setConfirmingLogout(false)}
          onConfirm={confirmLogout}
        />
      ) : null}
    </div>
  );
}
