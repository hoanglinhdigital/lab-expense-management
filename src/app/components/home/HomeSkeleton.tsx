export default function HomeSkeleton() {
  return (
    <div aria-busy>
      <span className="sr-only">Đang tải dữ liệu</span>

      <div className="bg-emerald-600 px-4 pb-4 pt-6">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="size-14 shrink-0 animate-pulse rounded-full bg-white/40" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-white/40" />
              <div className="h-5 w-40 animate-pulse rounded bg-white/40" />
            </div>
          </div>
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-white/60" />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
