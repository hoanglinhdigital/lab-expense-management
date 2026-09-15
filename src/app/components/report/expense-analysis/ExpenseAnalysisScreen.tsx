"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import FormAlert from "../../FormAlert";
import CategoryBreakdownList from "./CategoryBreakdownList";
import CategoryDonutChart from "./CategoryDonutChart";
import ExpenseAnalysisSkeleton from "./ExpenseAnalysisSkeleton";
import PeriodRangeLabel from "./PeriodRangeLabel";
import PeriodTypeTabs from "./PeriodTypeTabs";
import { ApiClientError, isUnauthorized } from "@/lib/api/client";
import { fetchCategoryBreakdown } from "@/lib/expense-analysis-client";
import type { CategoryBreakdown } from "@/lib/expense-analysis-client";
import {
  defaultPeriodFor,
  periodFromSearchParams,
  periodToQuery,
} from "@/lib/expense-analysis-types";
import type { AnalysisPeriod, PeriodGranularity } from "@/lib/expense-analysis-types";

const LOAD_ERROR = "Không tải được dữ liệu phân tích chi tiêu.";

export default function ExpenseAnalysisScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const period = periodFromSearchParams(searchParams);

  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const fetchKey = `${searchKey}::${reloadToken}`;
  const isLoading = loadedKey !== fetchKey;

  // Nhớ khoảng đã chọn của từng tab Day/Month/Year trong phiên xem này — đổi tab
  // không tự suy khoảng từ tab khác (xem plans/frontend/report_expense_analysis.md mục 3.4).
  const [savedByType, setSavedByType] = useState<
    Partial<Record<PeriodGranularity, AnalysisPeriod>>
  >(() => ({ [period.granularity]: period }));

  // setState chỉ nằm trong callback của promise, không gọi đồng bộ trong thân
  // effect — tránh cascading render (rule `react-hooks/set-state-in-effect`).
  useEffect(() => {
    let cancelled = false;
    const currentPeriod = periodFromSearchParams(new URLSearchParams(searchKey));
    fetchCategoryBreakdown(currentPeriod).then(
      (result) => {
        if (cancelled) return;
        setBreakdown(result);
        setError(null);
        setLoadedKey(fetchKey);
      },
      (fetchError: unknown) => {
        if (cancelled) return;
        if (isUnauthorized(fetchError)) {
          router.replace("/login");
          return;
        }
        setError(fetchError instanceof ApiClientError ? fetchError.message : LOAD_ERROR);
        setLoadedKey(fetchKey);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fetchKey, searchKey, router]);

  function retry() {
    setError(null);
    setReloadToken((token) => token + 1);
  }

  function applyPeriod(next: AnalysisPeriod) {
    setSavedByType((prev) => ({ ...prev, [next.granularity]: next }));
    const query = new URLSearchParams(periodToQuery(next)).toString();
    router.replace(`/report/expense-analysis?${query}`);
  }

  function changeGranularity(granularity: PeriodGranularity) {
    if (granularity === period.granularity) return;
    applyPeriod(savedByType[granularity] ?? defaultPeriodFor(granularity));
  }

  const periodQuery = periodToQuery(period);
  const isEmpty = !!breakdown && breakdown.totalAmount === 0;

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="bg-white px-4 pt-4">
        <h1 className="text-center text-xl font-semibold text-slate-800">Expense Analysis</h1>
      </header>

      <PeriodTypeTabs active={period.granularity} onChange={changeGranularity} />
      <PeriodRangeLabel period={period} onChange={applyPeriod} />

      <div className="mx-auto w-full max-w-2xl p-4">
        {error ? (
          <div className="mb-4">
            <FormAlert tone="error" message={error} onRetry={retry} />
          </div>
        ) : null}

        {isLoading && !error ? <ExpenseAnalysisSkeleton /> : null}

        {!isLoading && isEmpty ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-base font-medium text-slate-800">
              Chưa có chi tiêu nào trong kỳ này
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Thử chọn khoảng thời gian khác, hoặc ghi khoản chi mới.
            </p>
            <Link
              href="/record"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Ghi giao dịch
            </Link>
          </div>
        ) : null}

        {!isLoading && breakdown && !isEmpty ? (
          <>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <CategoryDonutChart items={breakdown.items} currency={breakdown.currency} />
            </div>
            <div className="mt-4">
              <CategoryBreakdownList
                items={breakdown.items}
                currency={breakdown.currency}
                periodQuery={periodQuery}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
