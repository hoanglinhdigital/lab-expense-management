export default function ExpenseAnalysisDetailSkeleton() {
  return (
    <div aria-busy>
      <span className="sr-only">Đang tải dữ liệu phân tích chi tiêu</span>
      <div className="space-y-3">
        <div className="h-14 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-14 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-14 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
