import AuthBrandHeader from "@/app/components/AuthBrandHeader";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative min-h-dvh bg-slate-50">
      {/* Dải gradient chỉ phủ phần trên, phần dưới card là nền trang. */}
      <div
        className="absolute inset-x-0 top-0 h-80 bg-gradient-to-br from-emerald-400 to-emerald-600"
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-md flex-col px-4 pt-12 pb-10">
        <AuthBrandHeader />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
