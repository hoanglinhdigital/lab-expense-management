import { Suspense } from "react";
import ExpenseAnalysisDetailScreen from "@/app/components/report/expense-analysis/ExpenseAnalysisDetailScreen";
import ExpenseAnalysisDetailSkeleton from "@/app/components/report/expense-analysis/ExpenseAnalysisDetailSkeleton";

export default function ExpenseAnalysisDetailPage() {
  return (
    <Suspense fallback={<ExpenseAnalysisDetailSkeleton />}>
      <ExpenseAnalysisDetailScreen />
    </Suspense>
  );
}
