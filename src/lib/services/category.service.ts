/**
 * Danh mục thu/chi (`docs/api-spec/category.yaml`).
 *
 * Quy tắc quyền — cốt lõi của cụm này:
 *   Đọc: scope = SYSTEM (userId = null) → mọi user đều thấy
 *        scope = USER                   → chỉ chủ sở hữu
 *   Ghi: scope = SYSTEM                 → 403 SYSTEM_CATEGORY_READONLY (luôn luôn)
 *        scope = USER của người khác    → 404 CATEGORY_NOT_FOUND
 */

import { Prisma } from "@/generated/prisma/client";
import { CategoryScope, CategoryType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  categoryNotFound,
  conflict,
  notFound,
  systemCategoryReadonly,
  validationError,
} from "@/lib/api/errors";
import {
  buildMeta,
  toSkipTake,
  type PaginationMeta,
} from "@/lib/api/pagination";
import {
  categorySelect,
  toCategoryDto,
  type CategoryDto,
  type CategoryRecord,
} from "@/lib/api/serializers/category.serializer";
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "@/lib/api/schemas/category.schema";

/** Điều kiện đọc: danh mục hệ thống dùng chung + danh mục của chính user. */
function readableWhere(userId: string): Prisma.CategoryWhereInput {
  return {
    isDeleted: false,
    OR: [{ scope: CategoryScope.SYSTEM }, { userId }],
  };
}

/** Đếm giao dịch chưa xoá dùng từng danh mục — một query cho cả trang. */
async function countUsage(
  userId: string,
  categoryIds: string[],
): Promise<Map<string, number>> {
  const usage = new Map<string, number>();
  if (categoryIds.length === 0) return usage;

  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, isDeleted: false, categoryId: { in: categoryIds } },
    _count: { _all: true },
  });

  for (const row of rows) {
    if (row.categoryId) usage.set(row.categoryId, row._count._all);
  }

  return usage;
}

export async function listCategories(
  userId: string,
  query: ListCategoriesQuery,
): Promise<{ data: CategoryDto[]; meta: PaginationMeta }> {
  const where: Prisma.CategoryWhereInput = {
    ...readableWhere(userId),
    ...(query.type ? { type: query.type } : {}),
    ...(query.scope ? { scope: query.scope } : {}),
    ...(query.keyword ? { name: { contains: query.keyword } } : {}),
    // Chuỗi rỗng = chỉ danh mục gốc; có giá trị = lọc đúng danh mục cha đó.
    ...(query.parentId !== undefined
      ? { parentId: query.parentId === "" ? null : query.parentId }
      : {}),
  };

  const orderBy: Prisma.CategoryOrderByWithRelationInput[] = [
    { name: "asc" },
    { id: "asc" },
  ];

  if (!query.tree) {
    const [total, categories] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        select: categorySelect,
        orderBy,
        ...toSkipTake(query),
      }),
    ]);

    const usage = await countUsage(
      userId,
      categories.map((category) => category.id),
    );

    return {
      data: categories.map((category) =>
        toCategoryDto(category, usage.get(category.id) ?? 0),
      ),
      meta: buildMeta(query, total),
    };
  }

  // tree=true: phân trang trên tập danh mục **gốc** trước, rồi mới nạp con của
  // đúng các gốc trong trang — không nạp cả cây rồi mới cắt.
  const rootWhere: Prisma.CategoryWhereInput = { ...where, parentId: null };

  const [total, roots] = await Promise.all([
    prisma.category.count({ where: rootWhere }),
    prisma.category.findMany({
      where: rootWhere,
      select: categorySelect,
      orderBy,
      ...toSkipTake(query),
    }),
  ]);

  const rootIds = roots.map((root) => root.id);
  const children =
    rootIds.length === 0
      ? []
      : await prisma.category.findMany({
          where: { ...readableWhere(userId), parentId: { in: rootIds } },
          select: categorySelect,
          orderBy,
        });

  const usage = await countUsage(userId, [
    ...rootIds,
    ...children.map((child) => child.id),
  ]);

  const childrenByParent = new Map<string, CategoryDto[]>();
  for (const child of children) {
    if (!child.parentId) continue;
    const list = childrenByParent.get(child.parentId) ?? [];
    list.push(toCategoryDto(child, usage.get(child.id) ?? 0));
    childrenByParent.set(child.parentId, list);
  }

  return {
    data: roots.map((root) =>
      toCategoryDto(root, usage.get(root.id) ?? 0, childrenByParent.get(root.id) ?? []),
    ),
    meta: buildMeta(query, total),
  };
}

export async function getCategory(
  userId: string,
  categoryId: string,
): Promise<CategoryDto> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, ...readableWhere(userId) },
    select: categorySelect,
  });

  if (!category) throw categoryNotFound();

  const usage = await countUsage(userId, [categoryId]);
  return toCategoryDto(category, usage.get(categoryId) ?? 0);
}

/**
 * Tìm danh mục để **ghi**. Thứ tự kiểm tra quan trọng: tìm bản ghi trước (kể cả
 * của user khác) → không có thì 404 → SYSTEM thì 403 → của người khác thì 404.
 */
async function getWritableCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, isDeleted: false },
    select: categorySelect,
  });

  if (!category) throw categoryNotFound();
  if (category.scope === CategoryScope.SYSTEM) throw systemCategoryReadonly();

  const owner = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!owner) throw categoryNotFound();

  return category;
}

/** Kiểm tra danh mục cha: đọc được, cùng `type`, và bản thân phải là gốc. */
async function assertValidParent(
  userId: string,
  parentId: string,
  type: CategoryType,
  childId?: string,
): Promise<void> {
  if (childId && parentId === childId) {
    throw validationError({ parentId: "Danh mục cha không thể là chính nó." });
  }

  const parent = await prisma.category.findFirst({
    where: { id: parentId, ...readableWhere(userId) },
    select: { id: true, type: true, parentId: true },
  });

  if (!parent) {
    throw notFound("PARENT_CATEGORY_NOT_FOUND", "Không tìm thấy danh mục cha.");
  }

  if (parent.type !== type) {
    throw validationError({ parentId: "Danh mục cha phải cùng loại thu/chi." });
  }

  // Chỉ cho lồng một cấp.
  if (parent.parentId !== null) {
    throw validationError({ parentId: "Chỉ cho phép lồng danh mục một cấp." });
  }

  if (childId) {
    const isOwnChild = await prisma.category.findFirst({
      where: { id: parentId, parentId: childId },
      select: { id: true },
    });
    if (isOwnChild) {
      throw validationError({
        parentId: "Danh mục cha không thể là danh mục con của chính nó.",
      });
    }
  }
}

async function assertNameAvailable(
  userId: string,
  name: string,
  type: CategoryType,
  exceptId?: string,
): Promise<void> {
  const duplicated = await prisma.category.findFirst({
    where: {
      userId,
      name,
      type,
      isDeleted: false,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });

  if (duplicated) {
    throw conflict(
      "CATEGORY_NAME_DUPLICATED",
      "Bạn đã có danh mục cùng tên trong nhóm này.",
      { name },
    );
  }
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
): Promise<CategoryDto> {
  if (input.parentId) {
    await assertValidParent(userId, input.parentId, input.type);
  }

  await assertNameAvailable(userId, input.name, input.type);

  const category = await prisma.category.create({
    data: {
      userId,
      // Danh mục tạo qua API luôn là USER — không có API tạo danh mục SYSTEM.
      scope: CategoryScope.USER,
      name: input.name,
      type: input.type,
      parentId: input.parentId ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
    },
    select: categorySelect,
  });

  return toCategoryDto(category, 0);
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<CategoryDto> {
  const category = await getWritableCategory(userId, categoryId);
  const nextType = input.type ?? category.type;

  if (input.type && input.type !== category.type) {
    const transactionCount = await prisma.transaction.count({
      where: { userId, isDeleted: false, categoryId },
    });
    if (transactionCount > 0) {
      throw conflict(
        "CATEGORY_TYPE_LOCKED",
        "Không thể đổi loại thu/chi của danh mục đang có giao dịch.",
        { transactionCount },
      );
    }

    // Cha và con phải cùng type, nên đổi type khi còn quan hệ là dữ liệu sai.
    const [childCount, parent] = await Promise.all([
      prisma.category.count({ where: { parentId: categoryId, isDeleted: false } }),
      category.parentId
        ? prisma.category.findUnique({
            where: { id: category.parentId },
            select: { type: true },
          })
        : Promise.resolve(null),
    ]);

    if (childCount > 0) {
      throw validationError({
        type: "Không thể đổi loại khi danh mục còn danh mục con.",
      });
    }
    if (parent && parent.type !== input.type) {
      throw validationError({
        type: "Loại thu/chi phải trùng với danh mục cha.",
      });
    }
  }

  if (input.parentId) {
    const childCount = await prisma.category.count({
      where: { parentId: categoryId, isDeleted: false },
    });
    if (childCount > 0) {
      throw validationError({
        parentId: "Danh mục đang có danh mục con nên không thể có danh mục cha.",
      });
    }

    await assertValidParent(userId, input.parentId, nextType, categoryId);
  }

  if (input.name || input.type) {
    await assertNameAvailable(
      userId,
      input.name ?? category.name,
      nextType,
      categoryId,
    );
  }

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
    select: categorySelect,
  });

  const usage = await countUsage(userId, [categoryId]);
  return toCategoryDto(updated, usage.get(categoryId) ?? 0);
}

export async function deleteCategory(
  userId: string,
  categoryId: string,
): Promise<void> {
  await getWritableCategory(userId, categoryId);

  const [transactionCount, childCount] = await Promise.all([
    prisma.transaction.count({ where: { userId, isDeleted: false, categoryId } }),
    prisma.category.count({ where: { parentId: categoryId, isDeleted: false } }),
  ]);

  if (transactionCount > 0 || childCount > 0) {
    throw conflict(
      "CATEGORY_IN_USE",
      transactionCount > 0
        ? "Không thể xoá danh mục đang có giao dịch."
        : "Không thể xoá danh mục còn danh mục con.",
      { transactionCount, childCount },
    );
  }

  await prisma.category.update({
    where: { id: categoryId },
    data: { isDeleted: true },
  });
}

// --- Dùng lại ở plan 05 (transaction) và 07 (report) -------------------------

/** Danh mục phải đọc được (USER của mình hoặc SYSTEM) và chưa xoá. */
export async function getReadableCategory(
  userId: string,
  categoryId: string,
): Promise<CategoryRecord> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, ...readableWhere(userId) },
    select: categorySelect,
  });

  if (!category) throw categoryNotFound();
  return category;
}

/** `[categoryId, ...id các con]` — dùng cho bộ lọc gộp danh mục con. */
export async function expandCategoryIds(
  userId: string,
  categoryId: string,
): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { ...readableWhere(userId), parentId: categoryId },
    select: { id: true },
  });

  return [categoryId, ...children.map((child) => child.id)];
}

/** Map `categoryId → id danh mục gốc` để báo cáo gom về danh mục cha level 1. */
export async function loadRootCategoryMap(
  userId: string,
): Promise<Map<string, string>> {
  const categories = await prisma.category.findMany({
    where: { OR: [{ scope: CategoryScope.SYSTEM }, { userId }] },
    select: { id: true, parentId: true },
  });

  const parentOf = new Map(categories.map((c) => [c.id, c.parentId]));
  const rootOf = new Map<string, string>();

  for (const category of categories) {
    // Chỉ lồng một cấp nên không cần lặp sâu, nhưng vẫn phòng dữ liệu cũ bị lệch.
    let current = category.id;
    let parent = parentOf.get(current) ?? null;
    let depth = 0;
    while (parent && depth < 10) {
      current = parent;
      parent = parentOf.get(current) ?? null;
      depth += 1;
    }
    rootOf.set(category.id, current);
  }

  return rootOf;
}
