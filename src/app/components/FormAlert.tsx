import { CircleAlert, Info } from "lucide-react";

interface FormAlertProps {
  message: string;
  tone: "error" | "info";
  onRetry?: () => void;
}

export default function FormAlert({ message, tone, onRetry }: FormAlertProps) {
  const isError = tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl border p-3 ${
        isError
          ? "border-rose-600 bg-rose-50 text-rose-600"
          : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      {isError ? (
        <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
      ) : (
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
      )}
      <p className="flex-1 text-sm">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-sm font-medium underline"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}
