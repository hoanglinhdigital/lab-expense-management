interface ScreenPlaceholderProps {
  title: string;
}

export default function ScreenPlaceholder({ title }: ScreenPlaceholderProps) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
      <p className="text-sm text-slate-500">To be implemented</p>
    </section>
  );
}
