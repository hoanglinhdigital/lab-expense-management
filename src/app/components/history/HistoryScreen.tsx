"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import FormAlert from "../FormAlert";
import HistoryHeader from "./HistoryHeader";
import PeriodSelectorButton from "./PeriodSelectorButton";
import TransactionGroupList from "./TransactionGroupList";
import HistorySkeleton from "./HistorySkeleton";
import { ApiClientError, isUnauthorized } from "@/lib/api/client";
import { fetchTransactions } from "@/lib/history-client";
import { groupByDate, rangeFromSearchParams } from "@/lib/history-types";
import type { TransactionListItem } from "@/lib/history-types";

const COMING_SOON = "Tính năng đang phát triển, vui lòng quay lại sau.";
const LOAD_ERROR = "Không tải được danh sách giao dịch.";

export default function HistoryScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const range = rangeFromSearchParams(searchParams);

  const [items, setItems] = useState<TransactionListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /** Tăng lên mỗi lần bấm "Thử lại" để chạy lại effect tải dữ liệu. */
  const [reloadToken, setReloadToken] = useState(0);
  /** Khoá của lần fetch cuối đã hoàn tất — so với `fetchKey` hiện tại để suy ra
   *  đang tải hay không, không cần setState đồng bộ trong thân effect (rule
   *  `react-hooks/set-state-in-effect`). */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const fetchKey = `${searchKey}::${reloadToken}`;
  const isLoading = loadedKey !== fetchKey;

  // setState chỉ nằm trong callback của promise, không gọi đồng bộ trong thân
  // effect — tránh cascading render (rule `react-hooks/set-state-in-effect`).
  useEffect(() => {
    let cancelled = false;
    const currentRange = rangeFromSearchParams(new URLSearchParams(searchKey));
    fetchTransactions(currentRange, 1).then(
      (result) => {
        if (cancelled) return;
        setItems(result.items);
        setPage(result.page);
        setPageSize(result.pageSize);
        setTotal(result.total);
        setError(null);
        setLoadedKey(fetchKey);
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
        setItems([]);
        setLoadedKey(fetchKey);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fetchKey, searchKey, router]);

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const result = await fetchTransactions(range, page + 1);
      setItems((previous) => [...previous, ...result.items]);
      setPage(result.page);
    } catch (fetchError) {
      if (isUnauthorized(fetchError)) {
        router.replace("/login");
        return;
      }
      setError(
        fetchError instanceof ApiClientError ? fetchError.message : LOAD_ERROR,
      );
    } finally {
      setLoadingMore(false);
    }
  }

  function retry() {
    setError(null);
    setReloadToken((token) => token + 1);
  }

  if (isLoading && items.length === 0 && !error) return <HistorySkeleton />;

  const groups = groupByDate(items);
  const hasMore = page * pageSize < total;

  return (
    <div className="min-h-dvh bg-slate-50">
      <HistoryHeader
        onBack={() => router.back()}
        onPlaceholder={() => setNotice(COMING_SOON)}
      />
      <PeriodSelectorButton
        label={range.label}
        onClick={() => router.push(`/history/period?${searchKey}`)}
      />

      <div className="mx-auto w-full max-w-2xl">
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

        {error && items.length === 0 ? null : items.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-base font-medium text-slate-800">
              Chưa có giao dịch nào trong kỳ này
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Ghi khoản thu hoặc chi đầu tiên để xem lịch sử giao dịch.
            </p>
            <Link
              href="/record"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Ghi giao dịch
            </Link>
          </div>
        ) : (
          <>
            <TransactionGroupList groups={groups} />
            {hasMore ? (
              <div className="flex justify-center p-4">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="min-h-11 rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:text-slate-400"
                >
                  {loadingMore ? "Đang tải..." : "Xem thêm"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
