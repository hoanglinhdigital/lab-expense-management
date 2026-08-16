export default function FlowDetailSkeleton() {
  return (
    <div aria-busy>
      <span className="sr-only">Đang tải số liệu</span>

      {[0, 1, 2, 3, 4].map((row) => (
        <div
          key={row}
          className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3"
        >
          <div className="mt-3 h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="flex flex-col items-end gap-3 py-3">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
