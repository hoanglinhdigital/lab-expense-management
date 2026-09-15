export default function ExpenseAnalysisSkeleton() {
  return (
    <div aria-busy>
      <span className="sr-only">Đang tải dữ liệu phân tích chi tiêu</span>
      <div className="mx-auto size-48 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-6 space-y-3">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
