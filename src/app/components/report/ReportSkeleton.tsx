export default function ReportSkeleton() {
  return (
    <div aria-busy>
      <span className="sr-only">Đang tải dữ liệu</span>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
