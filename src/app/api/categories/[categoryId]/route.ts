import { withAuth } from "@/lib/api/handler";
import { noContent, ok } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { updateCategorySchema } from "@/lib/api/schemas/category.schema";
import {
  deleteCategory,
  getCategory,
  updateCategory,
} from "@/lib/services/category.service";

type Params = { categoryId: string };

export const GET = withAuth<Params>(async (_request, user, { categoryId }) => {
  return ok(await getCategory(user.id, categoryId));
});

export const PATCH = withAuth<Params>(async (request, user, { categoryId }) => {
  const input = await parseJsonBody(request, updateCategorySchema);
  return ok(await updateCategory(user.id, categoryId, input));
});

export const DELETE = withAuth<Params>(async (_request, user, { categoryId }) => {
  await deleteCategory(user.id, categoryId);
  return noContent();
});
