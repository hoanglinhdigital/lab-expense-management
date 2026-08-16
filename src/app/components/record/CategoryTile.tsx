"use client";

interface CategoryTileProps {
  /** Emoji của category — dữ liệu người dùng chọn, không phải icon giao diện. */
  icon: string;
  name: string;
  selected?: boolean;
  onClick: () => void;
}

export default function CategoryTile({
  icon,
  name,
  selected,
  onClick,
}: CategoryTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex min-h-11 flex-col items-center gap-1 p-1"
    >
      <span
        aria-hidden
        className={`flex size-12 items-center justify-center rounded-2xl border text-2xl ${
          selected
            ? "border-emerald-600 bg-emerald-50"
            : "border-transparent bg-slate-100"
        }`}
      >
        {icon}
      </span>
      <span
        className={`line-clamp-2 text-center text-xs ${
          selected ? "font-medium text-emerald-600" : "text-slate-500"
        }`}
      >
        {name}
      </span>
    </button>
  );
}
