import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { updateUserSchema } from "@/lib/api/schemas/auth.schema";
import { getCurrentUser, updateCurrentUser } from "@/lib/services/auth.service";

export const GET = withAuth(async (_request, user) => {
  return ok(await getCurrentUser(user.id));
});

export const PATCH = withAuth(async (request, user) => {
  const input = await parseJsonBody(request, updateUserSchema);
  return ok(await updateCurrentUser(user.id, input));
});
