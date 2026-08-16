"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import BottomSheet from "../BottomSheet";
import CategoryTile from "./CategoryTile";
import type { CategoryOption, CategoryType } from "@/lib/record-types";

interface CategorySheetProps {
  categories: CategoryOption[];
  activeType: CategoryType;
  onTypeChange: (type: CategoryType) => void;
  selectedId: string;
  onSelect: (categoryId: string) => void;
  onAddNew: () => void;
  onClose: () => void;
  /** Cho phép đổi tab Expense/Income (Adjustment chỉ dùng category chi tiêu). */
  allowTypeSwitch?: boolean;
}

interface CategoryGroup {
  id: string;
  name: string;
  icon: string;
  items: CategoryOption[];
}

const TABS: { type: CategoryType; label: string }[] = [
  { type: "EXPENSE", label: "Expense category" },
  { type: "INCOME", label: "Income category" },
];

export default function CategorySheet({
  categories,
  activeType,
  onTypeChange,
  selectedId,
  onSelect,
  onAddNew,
  onClose,
  allowTypeSwitch = true,
}: CategorySheetProps) {
  const [keyword, setKeyword] = useState("");

  const groups = useMemo<CategoryGroup[]>(() => {
    const normalized = keyword.trim().toLowerCase();
    const sameType = categories.filter((item) => item.type === activeType);
    const parents = sameType.filter((item) => item.parentId === null);
    const parentIds = new Set(parents.map((item) => item.id));

    // Category cha chỉ đóng vai trò nhóm; category không có cha (vd nhóm Income)
    // được gom vào một nhóm không tiêu đề.
    const leaves = sameType.filter(
      (item) => item.parentId !== null || !hasChildren(sameType, item.id),
    );
    const matched = normalized
      ? leaves.filter((item) => item.name.toLowerCase().includes(normalized))
      : leaves;

    const result: CategoryGroup[] = [];
    const ungrouped = matched.filter(
      (item) => item.parentId === null || !parentIds.has(item.parentId),
    );
    if (ungrouped.length > 0) {
      result.push({ id: "__ungrouped", name: "", icon: "", items: ungrouped });
    }
    for (const parent of parents) {
      const items = matched.filter((item) => item.parentId === parent.id);
      if (items.length > 0) {
        result.push({
          id: parent.id,
          name: parent.name,
          icon: parent.icon,
          items,
        });
      }
    }
    return result;
  }, [categories, activeType, keyword]);

  const isEmpty = groups.length === 0;

  return (
    <BottomSheet title="Select Category" onClose={onClose}>
      <div className="relative">
        {allowTypeSwitch ? (
          <div
            role="tablist"
            aria-label="Loại danh mục"
            className="flex border-b border-slate-200"
          >
            {TABS.map((tab) => {
              const active = tab.type === activeType;
              return (
                <button
                  key={tab.type}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onTypeChange(tab.type)}
                  className={`min-h-11 flex-1 border-b-2 px-2 py-2 text-sm ${
                    active
                      ? "border-emerald-600 font-medium text-emerald-600"
                      : "border-transparent text-slate-500"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="p-3">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search size={16} className="shrink-0 text-slate-500" aria-hidden />
            <span className="sr-only">Tìm danh mục</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Enter category name"
              className="min-h-11 flex-1 bg-transparent text-sm text-slate-800 outline-none"
            />
          </label>
        </div>

        {isEmpty ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-slate-500">
              {keyword.trim()
                ? `Không có danh mục nào khớp "${keyword.trim()}".`
                : "Chưa có danh mục nào ở tab này."}
            </p>
            <button
              type="button"
              onClick={() => (keyword.trim() ? setKeyword("") : onAddNew())}
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {keyword.trim() ? "Xoá từ khoá" : "Thêm danh mục"}
            </button>
          </div>
        ) : (
          <div className="pb-20">
            {groups.map((group) => (
              <section key={group.id}>
                {group.name ? (
                  <h3 className="flex items-center gap-2 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800">
                    <span aria-hidden className="text-lg">
                      {group.icon}
                    </span>
                    {group.name}
                  </h3>
                ) : null}
                <div className="grid grid-cols-4 gap-2 px-3 py-3">
                  {group.items.map((category) => (
                    <CategoryTile
                      key={category.id}
                      icon={category.icon}
                      name={category.name}
                      selected={category.id === selectedId}
                      onClick={() => onSelect(category.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onAddNew}
          aria-label="Thêm danh mục"
          className="sticky bottom-4 left-full z-10 mr-4 flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
        >
          <Plus size={24} aria-hidden />
        </button>
      </div>
    </BottomSheet>
  );
}

function hasChildren(categories: CategoryOption[], parentId: string): boolean {
  return categories.some((item) => item.parentId === parentId);
}
