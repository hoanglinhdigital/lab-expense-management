/** Phân trang chung. Mỗi spec có `pageSize` mặc định/tối đa riêng nên truyền vào. */

import { z } from "zod";
import { intParam } from "./validation";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export function paginationSchema(options: {
  defaultPageSize: number;
  maxPageSize: number;
}) {
  return z.object({
    page: intParam({ min: 1, default: 1 }),
    pageSize: intParam({
      min: 1,
      max: options.maxPageSize,
      default: options.defaultPageSize,
    }),
  });
}

export function toSkipTake(input: { page: number; pageSize: number }) {
  return { skip: (input.page - 1) * input.pageSize, take: input.pageSize };
}

export function buildMeta(
  input: { page: number; pageSize: number },
  total: number,
): PaginationMeta {
  return { page: input.page, pageSize: input.pageSize, total };
}

/** Cắt trang trên mảng đã sort sẵn trong bộ nhớ. */
export function paginateArray<T>(
  items: T[],
  input: { page: number; pageSize: number },
): T[] {
  const { skip, take } = toSkipTake(input);
  return items.slice(skip, skip + take);
}
