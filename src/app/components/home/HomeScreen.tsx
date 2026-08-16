"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormAlert from "../FormAlert";
import ExchangeRateCard from "./ExchangeRateCard";
import ExpenseAnalysisCard from "./ExpenseAnalysisCard";
import FlowSummaryCard from "./FlowSummaryCard";
import HomeHeader from "./HomeHeader";
import HomeSkeleton from "./HomeSkeleton";
import LoanSummaryCard from "./LoanSummaryCard";
import { ApiClientError, isUnauthorized } from "@/lib/api/client";
import { fetchHomeOverview } from "@/lib/home-client";
import type { HomeOverview, PeriodRange } from "@/lib/home-types";

const COMING_SOON = "Tính năng đang phát triển, vui lòng quay lại sau.";
const LOAD_ERROR = "Không tải được dữ liệu tổng quan.";

export default function HomeScreen() {
  const router = useRouter();
  const [overview, setOverview] = useState<HomeOverview | null>(null);
  const [range, setRange] = useState<PeriodRange>("6M");
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [balanceHidden, setBalanceHidden] = useState(false);

  /** Tăng lên mỗi lần bấm "Thử lại" để chạy lại effect tải dữ liệu. */
  const [reloadToken, setReloadToken] = useState(0);

  // setState chỉ nằm trong callback của promise, không gọi đồng bộ trong thân
  // effect — tránh cascading render (rule `react-hooks/set-state-in-effect`).
  useEffect(() => {
    let cancelled = false;
    fetchHomeOverview(range).then(
      (result) => {
        if (cancelled) return;
        setOverview(result);
        setError(null);
        setChartLoading(false);
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
        setChartLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [range, reloadToken, router]);

  function retry() {
    setError(null);
    setReloadToken((token) => token + 1);
  }

  function handleRangeChange(next: PeriodRange) {
    if (next === range) return;
    setChartLoading(true);
    setRange(next);
  }

  if (!overview) {
    if (error) {
      return (
        <div className="mx-auto w-full max-w-2xl p-4">
          <FormAlert tone="error" message={error} onRetry={retry} />
        </div>
      );
    }
    return <HomeSkeleton />;
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <HomeHeader
        user={overview.user}
        balance={overview.balance}
        balanceHidden={balanceHidden}
        onToggleBalance={() => setBalanceHidden((previous) => !previous)}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
        {error ? <FormAlert tone="error" message={error} onRetry={retry} /> : null}
        {notice ? <FormAlert tone="info" message={notice} /> : null}

        <FlowSummaryCard
          flow={overview.flow}
          expenseByCategory={overview.expenseByCategory}
          onHistory={() => setNotice(COMING_SOON)}
        />

        <ExchangeRateCard
          rates={overview.exchangeRates}
          baseCurrency={overview.balance.currency}
          onComingSoon={() => setNotice(COMING_SOON)}
        />

        <ExpenseAnalysisCard
          points={overview.monthly}
          currency={overview.flow.currency}
          range={range}
          loading={chartLoading}
          onRangeChange={handleRangeChange}
        />

        <LoanSummaryCard
          loans={overview.loans}
          currency={overview.balance.currency}
          onViewAll={() => setNotice(COMING_SOON)}
        />
      </div>
    </div>
  );
}
