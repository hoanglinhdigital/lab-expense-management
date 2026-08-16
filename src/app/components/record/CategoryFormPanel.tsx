"use client";

import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import FullScreenPanel from "../FullScreenPanel";
import IconPickerPanel from "./IconPickerPanel";
import ParentCategoryPanel from "./ParentCategoryPanel";
import { DEFAULT_CATEGORY_ICON } from "@/lib/category-icons";
import type { CategoryOption, CategoryType } from "@/lib/record-types";

interface CategoryFormPanelProps {
  type: CategoryType;
  /** Toàn bộ category để lấy danh sách cha và kiểm tra trùng tên. */
  categories: CategoryOption[];
  onBack: () => void;
  onSubmit: (input: {
    name: string;
    icon: string;
    type: CategoryType;
    parentId: string | null;
  }) => Promise<void>;
}

type SubPanel = "none" | "icon" | "parent";

const MAX_NAME_LENGTH = 50;

export default function CategoryFormPanel({
  type,
  categories,
  onBack,
  onSubmit,
}: CategoryFormPanelProps) {
  const [icon, setIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [subPanel, setSubPanel] = useState<SubPanel>("none");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sameType = categories.filter((item) => item.type === type);
  const parents = sameType.filter((item) => item.parentId === null);
  const parent = parents.find((item) => item.id === parentId);
  // Income trong mockup là danh sách phẳng, không có category cha.
  const showParent = type === "EXPENSE";

  async function submit() {
    const value = name.trim();
    if (!value) {
      setError("Vui lòng nhập tên danh mục.");
      return;
    }
    if (value.length > MAX_NAME_LENGTH) {
      setError(`Tên tối đa ${MAX_NAME_LENGTH} ký tự.`);
      return;
    }
    if (sameType.some((item) => item.name.toLowerCase() === value.toLowerCase())) {
      setError("Danh mục này đã tồn tại.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      await onSubmit({
        name: value,
        icon,
        type,
        parentId: showParent ? parentId : null,
      });
    } catch {
      setError("Không tạo được danh mục. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  if (subPanel === "icon") {
    return (
      <IconPickerPanel
        value={icon}
        onSelect={(next) => {
          setIcon(next);
          setSubPanel("none");
        }}
        onBack={() => setSubPanel("none")}
      />
    );
  }

  if (subPanel === "parent") {
    return (
      <ParentCategoryPanel
        parents={parents}
        value={parentId}
        onSelect={(next) => {
          setParentId(next);
          setSubPanel("none");
        }}
        onBack={() => setSubPanel("none")}
      />
    );
  }

  return (
    <FullScreenPanel
      title={type === "EXPENSE" ? "Add expense category" : "Add income category"}
      onBack={onBack}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-start gap-4 bg-white p-4">
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSubPanel("icon")}
              aria-label="Chọn icon"
              className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-3xl"
            >
              <span aria-hidden>{icon}</span>
            </button>
            <button
              type="button"
              onClick={() => setSubPanel("icon")}
              className="mt-1 text-xs font-medium text-emerald-600"
            >
              Select icon
            </button>
          </div>

          <div className="flex-1">
            <label htmlFor="category-name" className="sr-only">
              Tên danh mục
            </label>
            <input
              id="category-name"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              disabled={pending}
              placeholder="Tên danh mục"
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              className={`min-h-11 w-full border-b bg-transparent px-1 py-2 text-base text-slate-800 outline-none ${
                error ? "border-rose-600" : "border-slate-200 focus:border-emerald-600"
              }`}
            />
            {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
          </div>
        </div>

        {showParent ? (
          <div className="mt-2 flex items-center gap-3 bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => setSubPanel("parent")}
              className="flex min-h-11 flex-1 items-center gap-3 text-left"
            >
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl"
              >
                {parent ? parent.icon : "--"}
              </span>
              <span className="flex-1">
                <span className="block text-xs text-slate-500">
                  Select parent category
                </span>
                <span className="block truncate text-sm font-medium text-slate-800">
                  {parent ? parent.name : "(No item selected)"}
                </span>
              </span>
              {parent ? null : (
                <ChevronRight size={16} className="shrink-0 text-slate-500" aria-hidden />
              )}
            </button>
            {parent ? (
              <button
                type="button"
                onClick={() => setParentId(null)}
                aria-label="Bỏ chọn danh mục cha"
                className="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
              >
                <X size={16} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="p-4">
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {pending ? "Đang lưu..." : "Save"}
          </button>
        </div>
      </form>
    </FullScreenPanel>
  );
}
