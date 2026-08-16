/**
 * Lớp dữ liệu phía client cho màn Setting.
 *
 * Chưa có API thật (`docs/api-spec/` chưa có spec cho profile/auth), nên đây là
 * stub: giả lập độ trễ mạng rồi trả về dữ liệu mẫu khớp mockup. Khi API sẵn sàng
 * chỉ cần thay thân hàm bằng `fetch` (gợi ý: GET /api/me/profile và
 * POST /api/auth/logout) — kiểu trả về giữ nguyên nên UI không phải sửa.
 */

import type { UserProfile } from "./setting-types";

const PROFILE: UserProfile = {
  displayName: "Linh Nguyễn",
  membershipLabel: "Premium Member",
  validUntil: "2999-12-31",
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchUserProfile(): Promise<UserProfile> {
  await delay(500);
  // TODO: thay bằng GET /api/me/profile khi API sẵn sàng.
  return PROFILE;
}

export async function logout(): Promise<void> {
  await delay(400);
  // TODO: thay bằng POST /api/auth/logout khi API sẵn sàng.
}
