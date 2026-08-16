"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormAlert from "../FormAlert";
import ExpenseIncomeCard from "./ExpenseIncomeCard";
import FinancialStatementCard from "./FinancialStatementCard";
import ReportShortcutGrid from "./ReportShortcutGrid";
import ReportSkeleton from "./ReportSkeleton";
import { ApiClientError, isUnauthorized } from "@/lib/api/client";
import { fetchReportOverview } from "@/lib/report-client";
import type { ReportOverview } from "@/lib/report-types";

const COMING_SOON = "Tính năng đang phát triển, vui lòng quay lại sau.";
const LOAD_ERROR = "Không tải được dữ liệu báo cáo.";

export default function ReportScreen() {
  const router = useRouter();
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Tăng lên mỗi lần bấm "Thử lại" để chạy lại effect tải dữ liệu. */
  const [reloadToken, setReloadToken] = useState(0);

  // setState chỉ nằm trong callback của promise, không gọi đồng bộ trong thân
  // effect — tránh cascading render (rule `react-hooks/set-state-in-effect`).
  useEffect(() => {
    let cancelled = false;
    fetchReportOverview().then(
      (result) => {
        if (cancelled) return;
        setOverview(result);
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
  }, [reloadToken, router]);

  function retry() {
    setError(null);
    setReloadToken((token) => token + 1);
  }

  if (!overview) {
    if (error) {
      return (
        <div className="mx-auto w-full max-w-2xl p-4">
          <FormAlert tone="error" message={error} onRetry={retry} />
        </div>
      );
    }
    return <ReportSkeleton />;
  }

  const { statement, flow } = overview;
  const isEmpty =
    statement.netWorth === 0 && flow.income === 0 && flow.expense === 0;

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <h1 className="text-center text-xl font-semibold text-slate-800">
          Report
        </h1>

        {error ? <FormAlert tone="error" message={error} onRetry={retry} /> : null}
        {notice ? <FormAlert tone="info" message={notice} /> : null}

        {isEmpty ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-base font-medium text-slate-800">
              Chưa có dữ liệu báo cáo
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Ghi khoản thu hoặc chi đầu tiên để xem tình hình tài chính của bạn.
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
            <FinancialStatementCard statement={statement} />
            <ExpenseIncomeCard flow={flow} />
          </>
        )}

        <ReportShortcutGrid onSelect={() => setNotice(COMING_SOON)} />
      </div>
    </div>
  );
}
