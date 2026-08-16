import { Wallet } from "lucide-react";

export default function AuthBrandHeader() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-white/25 text-white">
        <Wallet size={24} aria-hidden />
      </span>
      <h1 className="text-xl font-semibold text-white">Expense Tracker</h1>
      <p className="text-sm text-white/85">Quản lý chi tiêu thông minh</p>
    </div>
  );
}
