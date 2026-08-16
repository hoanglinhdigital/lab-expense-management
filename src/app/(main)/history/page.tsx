import { Suspense } from "react";
import HistoryScreen from "@/app/components/history/HistoryScreen";
import HistorySkeleton from "@/app/components/history/HistorySkeleton";

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <HistoryScreen />
    </Suspense>
  );
}
