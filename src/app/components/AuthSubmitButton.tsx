import { Loader2 } from "lucide-react";

interface AuthSubmitButtonProps {
  label: string;
  pending: boolean;
}

export default function AuthSubmitButton({
  label,
  pending,
}: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-base font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-70"
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" aria-hidden />
      ) : null}
      {pending ? "Đang xử lý..." : label}
    </button>
  );
}
