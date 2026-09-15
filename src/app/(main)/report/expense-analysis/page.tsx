import { Suspense } from "react";
import ExpenseAnalysisScreen from "@/app/components/report/expense-analysis/ExpenseAnalysisScreen";
import ExpenseAnalysisSkeleton from "@/app/components/report/expense-analysis/ExpenseAnalysisSkeleton";

export default function ExpenseAnalysisPage() {
  return (
    <Suspense fallback={<ExpenseAnalysisSkeleton />}>
      <ExpenseAnalysisScreen />
    </Suspense>
  );
}
