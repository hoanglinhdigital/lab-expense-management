export default function HistorySkeleton() {
  return (
    <div className="min-h-dvh bg-slate-50" aria-busy>
      <span className="sr-only">Đang tải dữ liệu</span>
      <div className="h-14 animate-pulse border-b border-slate-200 bg-white" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 p-4">
        <div className="mx-auto h-6 w-28 animate-pulse rounded-full bg-slate-200" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
