export default function AccountSkeleton() {
  return (
    <div aria-busy>
      <span className="sr-only">Đang tải dữ liệu</span>

      <div className="bg-emerald-600 px-4 pb-10 pt-6">
        <div className="mx-auto w-full max-w-2xl">
          <div className="h-6 w-40 animate-pulse rounded bg-white/40" />
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-white/60" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl p-4">
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
