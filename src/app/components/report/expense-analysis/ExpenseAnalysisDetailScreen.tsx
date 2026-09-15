"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import FormAlert from "../../FormAlert";
import CategoryChildAccordion from "./CategoryChildAccordion";
import ExpenseAnalysisDetailSkeleton from "./ExpenseAnalysisDetailSkeleton";
import PeriodRangeLabel from "./PeriodRangeLabel";
import PeriodTypeTabs from "./PeriodTypeTabs";
import { ApiClientError, isUnauthorized } from "@/lib/api/client";
import { fetchCategoryBreakdown, fetchCategorySummary } from "@/lib/expense-analysis-client";
import type { CategoryBreakdown, CategorySummary } from "@/lib/expense-analysis-client";
import {
  defaultPeriodFor,
  periodFromSearchParams,
  periodToQuery,
} from "@/lib/expense-analysis-types";
import type { AnalysisPeriod, PeriodGranularity } from "@/lib/expense-analysis-types";

const LOAD_ERROR = "Không tải được dữ liệu phân tích chi tiêu.";
const NOT_FOUND_ERROR = "Không tìm thấy danh mục này.";

export default function ExpenseAnalysisDetailScreen() {
  const router = useRouter();
  const params = useParams<{ categoryId: string }>();
  const categoryId = params.categoryId;
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const period = periodFromSearchParams(searchParams);

  const [category, setCategory] = useState<CategorySummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const fetchKey = `${categoryId}::${searchKey}::${reloadToken}`;
  const isLoading = loadedKey !== fetchKey;

  const [savedByType, setSavedByType] = useState<
    Partial<Record<PeriodGranularity, AnalysisPeriod>>
  >(() => ({ [period.granularity]: period }));

  // setState chỉ nằm trong callback của promise, không gọi đồng bộ trong thân
  // effect — tránh cascading render (rule `react-hooks/set-state-in-effect`).
  useEffect(() => {
    let cancelled = false;
    const currentPeriod = periodFromSearchParams(new URLSearchParams(searchKey));
    Promise.all([
      fetchCategorySummary(categoryId),
      fetchCategoryBreakdown(currentPeriod, categoryId),
    ]).then(
      ([categoryResult, breakdownResult]) => {
        if (cancelled) return;
        setCategory(categoryResult);
        setBreakdown(breakdownResult);
        setError(null);
        setNotFound(false);
        setLoadedKey(fetchKey);
      },
      (fetchError: unknown) => {
        if (cancelled) return;
        if (isUnauthorized(fetchError)) {
          router.replace("/login");
          return;
        }
        if (fetchError instanceof ApiClientError && fetchError.status === 404) {
          setNotFound(true);
          setLoadedKey(fetchKey);
          return;
        }
        setError(fetchError instanceof ApiClientError ? fetchError.message : LOAD_ERROR);
        setLoadedKey(fetchKey);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [categoryId, fetchKey, searchKey, router]);

  function retry() {
    setError(null);
    setReloadToken((token) => token + 1);
  }

  function applyPeriod(next: AnalysisPeriod) {
    setSavedByType((prev) => ({ ...prev, [next.granularity]: next }));
    const query = new URLSearchParams(periodToQuery(next)).toString();
    router.replace(`/report/expense-analysis/${categoryId}?${query}`);
  }

  function changeGranularity(granularity: PeriodGranularity) {
    if (granularity === period.granularity) return;
    applyPeriod(savedByType[granularity] ?? defaultPeriodFor(granularity));
  }

  const backHref = `/report/expense-analysis?${searchKey}`;

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="flex items-center gap-1 bg-white px-2 pt-2">
        <Link
          href={backHref}
          aria-label="Quay lại"
          className="flex min-h-11 min-w-11 items-center justify-center text-slate-800"
        >
          <ChevronLeft size={24} aria-hidden />
        </Link>
        <h1 className="flex-1 truncate text-center text-xl font-semibold text-slate-800">
          {category?.name ?? "Expense Analysis"}
        </h1>
        <span className="size-11 shrink-0" aria-hidden />
      </header>

      {notFound ? (
        <div className="mx-auto w-full max-w-2xl p-4">
          <FormAlert tone="error" message={NOT_FOUND_ERROR} />
          <Link
            href="/report/expense-analysis"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Quay lại Expense Analysis
          </Link>
        </div>
      ) : (
        <>
          <PeriodTypeTabs active={period.granularity} onChange={changeGranularity} />
          <PeriodRangeLabel period={period} onChange={applyPeriod} />

          <div className="mx-auto w-full max-w-2xl p-4">
            {error ? (
              <div className="mb-4">
                <FormAlert tone="error" message={error} onRetry={retry} />
              </div>
            ) : null}

            {isLoading && !error ? <ExpenseAnalysisDetailSkeleton /> : null}

            {!isLoading && breakdown && breakdown.items.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <p className="text-base font-medium text-slate-800">
                  Chưa có chi tiêu nào trong kỳ này cho danh mục này
                </p>
              </div>
            ) : null}

            {!isLoading && breakdown && breakdown.items.length > 0 ? (
              <CategoryChildAccordion
                items={breakdown.items}
                currency={breakdown.currency}
                period={period}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
