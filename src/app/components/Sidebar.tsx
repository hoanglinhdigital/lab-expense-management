"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "./navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-1 border-r border-slate-200 bg-white p-3 md:flex"
    >
      <span className="px-3 py-4 text-base font-medium text-slate-800">
        Quản lý chi tiêu
      </span>

      {NAV_ITEMS.map(({ href, label, icon: Icon, isPrimary }) => {
        const active = isNavItemActive(pathname, href);

        if (isPrimary) {
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`my-1 flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors ${
                active ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <Icon size={20} aria-hidden />
              {label}
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-emerald-50 font-medium text-emerald-600"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Icon size={20} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
