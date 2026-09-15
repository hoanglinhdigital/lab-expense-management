"use client";

import { useState } from "react";
import CategoryChildRow from "./CategoryChildRow";
import { fetchCategoryTransactions } from "@/lib/expense-analysis-client";
import type { CategoryBreakdownEntry, CategoryTransactionItem } from "@/lib/expense-analysis-client";
import type { AnalysisPeriod } from "@/lib/expense-analysis-types";

interface CategoryChildAccordionProps {
  items: CategoryBreakdownEntry[];
  currency: string;
  period: AnalysisPeriod;
}

const TRANSACTIONS_LOAD_ERROR = "Không tải được giao dịch.";

/**
 * Nhánh `parentId` của `getExpenseByCategory` không bao giờ trả mục "Chưa phân
 * loại" (`categoryId = null`) — mọi item ở đây đều có `categoryId` thật.
 */
export default function CategoryChildAccordion({
  items,
  currency,
  period,
}: CategoryChildAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [transactionsById, setTransactionsById] = useState<
    Record<string, CategoryTransactionItem[]>
  >({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  function toggle(childId: string) {
    if (openId === childId) {
      setOpenId(null);
      return;
    }
    setOpenId(childId);
    if (transactionsById[childId] || loadingId === childId) return;

    setLoadingId(childId);
    fetchCategoryTransactions(childId, period).then(
      (result) => {
        setTransactionsById((prev) => ({ ...prev, [childId]: result }));
        setLoadingId(null);
      },
      () => {
        setErrorById((prev) => ({ ...prev, [childId]: TRANSACTIONS_LOAD_ERROR }));
        setLoadingId(null);
      },
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {items.map((item) => {
        const childId = item.categoryId;
        if (!childId) return null;
        return (
          <CategoryChildRow
            key={childId}
            item={item}
            currency={currency}
            open={openId === childId}
            loading={loadingId === childId}
            error={errorById[childId]}
            transactions={transactionsById[childId]}
            onToggle={() => toggle(childId)}
          />
        );
      })}
    </div>
  );
}
