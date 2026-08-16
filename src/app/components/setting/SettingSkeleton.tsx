export default function SettingSkeleton() {
  return (
    <div aria-busy>
      <span className="sr-only">Đang tải dữ liệu</span>

      <div className="h-40 animate-pulse bg-slate-200" />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
