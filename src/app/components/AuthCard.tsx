import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}
