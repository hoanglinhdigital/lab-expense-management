import { Suspense } from "react";
import HistoryPeriodScreen from "@/app/components/history/HistoryPeriodScreen";

export default function HistoryPeriodPage() {
  return (
    <Suspense fallback={null}>
      <HistoryPeriodScreen />
    </Suspense>
  );
}
