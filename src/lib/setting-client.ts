/**
 * Lớp dữ liệu phía client cho màn Setting.
 *
 * `auth/me` không có field membership/subscription (backend chưa có tính năng
 * này) nên `membershipLabel`/`validUntil` giữ giá trị tĩnh — chỉ `displayName`
 * lấy từ user thật.
 */

import { apiFetch } from "./api/client";
import type { UserProfile } from "./setting-types";

const STATIC_MEMBERSHIP = {
  membershipLabel: "Premium Member",
  validUntil: "2999-12-31",
};

interface UserResponse {
  data: { name: string };
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const { data } = await apiFetch<UserResponse>("/auth/me");
  return { displayName: data.name, ...STATIC_MEMBERSHIP };
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}
