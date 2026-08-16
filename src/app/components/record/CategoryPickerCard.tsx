"use client";

import { ChevronRight, Pencil, Plus } from "lucide-react";
import CategoryTile from "./CategoryTile";
import type { CategoryOption } from "@/lib/record-types";

/** Số ô category hiển thị ở khối "Most used" (ô cuối cùng dành cho nút Edit). */
const MOST_USED_LIMIT = 7;

interface CategoryPickerCardProps {
  categories: CategoryOption[];
  selectedId: string;
  onSelect: (categoryId: string) => void;
  /** Mở sheet đầy đủ (link "All" và ô "Edit"). */
  onOpenAll: () => void;
  onAddNew: () => void;
  error?: string;
}

export default function CategoryPickerCard({
  categories,
  selectedId,
  onSelect,
  onOpenAll,
  onAddNew,
  error,
}: CategoryPickerCardProps) {
  const selected = categories.find((item) => item.id === selectedId);
  const mostUsed = [...categories]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, MOST_USED_LIMIT);

  return (
    <section className="rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onAddNew}
          className="flex min-h-11 items-center gap-2 text-base font-medium text-slate-800"
        >
          <Plus size={16} className="text-emerald-600" aria-hidden />
          {selected ? selected.name : "Select category"}
        </button>
        <button
          type="button"
          onClick={onOpenAll}
          className="flex min-h-11 items-center gap-1 text-sm font-medium text-emerald-600"
        >
          All
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-slate-500">
            Chưa có danh mục nào. Tạo danh mục đầu tiên để ghi giao dịch.
          </p>
          <button
            type="button"
            onClick={onAddNew}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Thêm danh mục
          </button>
        </div>
      ) : (
        <>
          <p className="mt-2 text-xs text-slate-500">Most used</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {mostUsed.map((category) => (
              <CategoryTile
                key={category.id}
                icon={category.icon}
                name={category.name}
                selected={category.id === selectedId}
                onClick={() => onSelect(category.id)}
              />
            ))}
            <button
              type="button"
              onClick={onOpenAll}
              className="flex min-h-11 flex-col items-center gap-1 p-1"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                <Pencil size={16} className="text-emerald-600" aria-hidden />
              </span>
              <span className="text-xs text-emerald-600">Edit</span>
            </button>
          </div>
        </>
      )}

      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </section>
  );
}
