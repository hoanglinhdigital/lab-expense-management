import { House, PieChart, Plus, Settings, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hành động chính (Record) — hiển thị nổi bật ở giữa tab bar. */
  isPrimary?: boolean;
}

/** Thứ tự trong mảng = thứ tự hiển thị từ trái sang phải trên tab bar. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/account", label: "Account", icon: Wallet },
  { href: "/record", label: "Record", icon: Plus, isPrimary: true },
  { href: "/report", label: "Report", icon: PieChart },
  { href: "/setting", label: "Setting", icon: Settings },
];

/**
 * Home chỉ active khi ở đúng "/", các tab khác active cả ở route con
 * (vd "/account/123" vẫn sáng tab Account).
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
