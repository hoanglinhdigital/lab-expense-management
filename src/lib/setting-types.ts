/**
 * Kiểu dữ liệu và danh mục hành động cho màn Setting.
 *
 * Lưu ý về màu: màn Setting là ngoại lệ đã được user duyệt — giữ đúng tông của
 * `docs/mockup/setting/setting-1.png` (header cam, icon xanh dương) thay vì bảng
 * màu emerald dùng chung. Ngoại lệ chỉ áp dụng trong phạm vi màn này.
 */

import {
  Calculator,
  CircleQuestionMark,
  Database,
  DollarSign,
  FileText,
  LayoutList,
  LogOut,
  Mail,
  PiggyBank,
  ScanLine,
  Settings,
  Share2,
  Smartphone,
  Star,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Thông tin người dùng hiển thị ở header màn Setting. */
export interface UserProfile {
  displayName: string;
  /** Hạng thành viên, ví dụ "Premium Member". Rỗng thì ẩn card hạng. */
  membershipLabel: string;
  /** Ngày hết hạn dạng "YYYY-MM-DD". */
  validUntil: string;
}

/** Một ô trong lưới Feature / Utilities. */
export interface SettingAction {
  id: string;
  label: string;
  icon: LucideIcon;
}

/** Thứ tự trong mảng = thứ tự hiển thị từ trái sang phải. */
export const SETTING_FEATURES: SettingAction[] = [
  { id: "interface", label: "Interface", icon: Smartphone },
  { id: "bill-extraction", label: "Bill Extraction", icon: ScanLine },
  { id: "budget", label: "Budget", icon: PiggyBank },
  { id: "categories", label: "Categories", icon: LayoutList },
];

export const SETTING_UTILITIES: SettingAction[] = [
  { id: "calculate-loan", label: "Calculate loan", icon: Calculator },
  { id: "income-tax", label: "Personal Income Tax", icon: UserRound },
  { id: "exchange-rates", label: "Exchange rates utility", icon: DollarSign },
  { id: "export-data", label: "Export data", icon: FileText },
];

/** Một dòng trong card menu ở cuối màn. */
export interface SettingMenuItem {
  id: string;
  label: string;
  /** Dòng phụ dưới nhãn, ví dụ lời mời đánh giá app. */
  description?: string;
  icon: LucideIcon;
  /** Hành động nguy hiểm (Logout) — hiển thị màu rose. */
  tone?: "danger";
}

/** Id của dòng đăng xuất — nơi gọi cần phân biệt để mở dialog xác nhận. */
export const LOGOUT_ITEM_ID = "logout";

export const SETTING_MENU: SettingMenuItem[] = [
  { id: "general", label: "General settings", icon: Settings },
  { id: "data", label: "Data", icon: Database },
  { id: "share", label: "Share with friends", icon: Share2 },
  {
    id: "rate",
    label: "Do you like this app?",
    description: "Rate us 5 stars on Apple Store!",
    icon: Star,
  },
  { id: "feedback", label: "Feedback", icon: Mail },
  { id: "help", label: "Help & Information", icon: CircleQuestionMark },
  { id: LOGOUT_ITEM_ID, label: "Logout", icon: LogOut, tone: "danger" },
];

/** "Linh Nguyễn" -> "L". Tên rỗng/toàn khoảng trắng -> "?". */
export function profileInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}
