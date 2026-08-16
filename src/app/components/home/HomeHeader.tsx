"use client";

import BalanceCard from "./BalanceCard";
import type { BalanceSummary, UserSummary } from "@/lib/home-types";

interface HomeHeaderProps {
  user: UserSummary;
  balance: BalanceSummary;
  balanceHidden: boolean;
  onToggleBalance: () => void;
}

/** Chữ cái đầu của tên, dùng làm avatar khi user chưa có ảnh đại diện. */
function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export default function HomeHeader({
  user,
  balance,
  balanceHidden,
  onToggleBalance,
}: HomeHeaderProps) {
  return (
    <header className="bg-emerald-600 px-4 pb-4 pt-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-xl font-semibold text-emerald-600"
          >
            {initial(user.name)}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-white">Hello!</p>
            <p className="truncate text-xl font-semibold text-white">
              {user.name}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <BalanceCard
            balance={balance}
            hidden={balanceHidden}
            onToggle={onToggleBalance}
          />
        </div>
      </div>
    </header>
  );
}
