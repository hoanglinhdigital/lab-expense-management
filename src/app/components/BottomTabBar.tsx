"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "./navigation";

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isPrimary }) => {
          const active = isNavItemActive(pathname, href);

          if (isPrimary) {
            return (
              <li key={href} className="flex flex-1 justify-center">
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`-mt-5 flex size-14 items-center justify-center rounded-full border-4 border-white text-white shadow-lg transition-colors ${
                    active
                      ? "bg-emerald-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  <Icon size={24} aria-hidden />
                </Link>
              </li>
            );
          }

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors ${
                  active ? "text-emerald-600" : "text-slate-500"
                }`}
              >
                <Icon size={20} aria-hidden />
                <span className="text-xs">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
