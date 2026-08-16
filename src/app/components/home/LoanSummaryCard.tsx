"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import LoanRow from "./LoanRow";
import type { LoanItem } from "@/lib/home-types";

interface LoanSummaryCardProps {
  loans: LoanItem[];
  currency: string;
  /** Màn hình danh sách đầy đủ chưa có → tạm báo "đang phát triển". */
  onViewAll: () => void;
}

export default function LoanSummaryCard({
  loans,
  currency,
  onViewAll,
}: LoanSummaryCardProps) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 text-base font-medium text-slate-800">
          Money lent/borrowed
        </h2>
        <button
          type="button"
          onClick={onViewAll}
          className="flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-emerald-600"
        >
          View All
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>

      {loans.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-slate-800">
            Chưa có khoản vay hoặc cho mượn nào
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Ghi giao dịch loại Borrow hoặc Lend để theo dõi tại đây.
          </p>
          <Link
            href="/record"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Ghi giao dịch
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {loans.map((loan) => (
            <LoanRow key={loan.id} loan={loan} currency={currency} />
          ))}
        </ul>
      )}
    </section>
  );
}
