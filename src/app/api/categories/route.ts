import { withAuth } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { parseJsonBody, parseQuery } from "@/lib/api/validation";
import {
  createCategorySchema,
  listCategoriesQuerySchema,
} from "@/lib/api/schemas/category.schema";
import { createCategory, listCategories } from "@/lib/services/category.service";

export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request.nextUrl, listCategoriesQuerySchema);
  const { data, meta } = await listCategories(user.id, query);
  return ok(data, meta);
});

export const POST = withAuth(async (request, user) => {
  const input = await parseJsonBody(request, createCategorySchema);
  return created(await createCategory(user.id, input));
});
