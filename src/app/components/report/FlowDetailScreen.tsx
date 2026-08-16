"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft } from "lucide-react";
import FormAlert from "../FormAlert";
import FlowDetailSkeleton from "./FlowDetailSkeleton";
import FlowPeriodRow from "./FlowPeriodRow";
import FlowPeriodTabs from "./FlowPeriodTabs";
import { ApiClientError, isUnauthorized } from "@/lib/api/client";
import { fetchFlowDetail } from "@/lib/report-client";
import type { FlowDetail, PeriodTab } from "@/lib/report-types";

const COMING_SOON = "Tính năng đang phát triển, vui lòng quay lại sau.";
const LOAD_ERROR = "Không tải được số liệu thu chi.";

export default function FlowDetailScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<PeriodTab>("CURRENT");
  const [detail, setDetail] = useState<FlowDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Tăng lên mỗi lần bấm "Thử lại" để chạy lại effect tải dữ liệu. */
  const [reloadToken, setReloadToken] = useState(0);

  // setState chỉ nằm trong callback của promise, không gọi đồng bộ trong thân
  // effect — tránh cascading render (rule `react-hooks/set-state-in-effect`).
  useEffect(() => {
    let cancelled = false;
    fetchFlowDetail(tab).then(
      (result) => {
        if (cancelled) return;
        setDetail(result);
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
  }, [tab, reloadToken, router]);

  function retry() {
    setError(null);
    setReloadToken((token) => token + 1);
  }

  function handleTabChange(next: PeriodTab) {
    if (next === tab) return;
    setDetail(null);
    setNotice(null);
    setTab(next);
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="flex items-center gap-1 bg-white px-2 pt-2">
        <Link
          href="/report"
          aria-label="Quay lại"
          className="flex min-h-11 min-w-11 items-center justify-center text-slate-800"
        >
          <ChevronLeft size={24} aria-hidden />
        </Link>
        <h1 className="text-xl font-semibold text-slate-800">
          Expense vs Income
        </h1>
      </header>

      <FlowPeriodTabs active={tab} onChange={handleTabChange} />

      <div className="mx-auto w-full max-w-2xl">
        {detail ? (
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <CalendarDays size={16} className="text-slate-500" aria-hidden />
            <span className="text-sm text-slate-500">{detail.scopeLabel}</span>
          </div>
        ) : null}

        {error ? (
          <div className="p-4">
            <FormAlert tone="error" message={error} onRetry={retry} />
          </div>
        ) : null}

        {notice ? (
          <div className="p-4">
            <FormAlert tone="info" message={notice} />
          </div>
        ) : null}

        {!detail && !error ? <FlowDetailSkeleton /> : null}

        {detail && detail.periods.length === 0 ? (
          <div className="p-4">
            <FormAlert tone="info" message={COMING_SOON} />
          </div>
        ) : null}

        {detail?.periods.map((period) => (
          <FlowPeriodRow
            key={period.id}
            period={period}
            currency={detail.currency}
            onDetail={() => setNotice(COMING_SOON)}
          />
        ))}
      </div>
    </div>
  );
}
