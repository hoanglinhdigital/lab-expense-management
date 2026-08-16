/** Map record Prisma → schema `Category` của `category.yaml`. */

import type { CategoryScope, CategoryType } from "@/generated/prisma/enums";

export interface CategoryDto {
  id: string;
  name: string;
  type: CategoryType;
  scope: CategoryScope;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  usageCount: number;
  children?: CategoryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  type: CategoryType;
  scope: CategoryScope;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const categorySelect = {
  id: true,
  name: true,
  type: true,
  scope: true,
  parentId: true,
  icon: true,
  color: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function toCategoryDto(
  category: CategoryRecord,
  usageCount: number,
  children?: CategoryDto[],
): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    scope: category.scope,
    parentId: category.parentId,
    icon: category.icon,
    color: category.color,
    usageCount,
    ...(children ? { children } : {}),
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

/** Thông tin rút gọn dùng trong response của transaction. */
export interface CategoryRefDto {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  parentId: string | null;
}

export const categoryRefSelect = {
  id: true,
  name: true,
  type: true,
  icon: true,
  color: true,
  parentId: true,
} as const;
