"use client";

import { Loader2 } from "lucide-react";

interface SaveButtonProps {
  pending?: boolean;
  label?: string;
}

export default function SaveButton({
  pending,
  label = "Save",
}: SaveButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
    >
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
      {pending ? "Đang lưu..." : label}
    </button>
  );
}
