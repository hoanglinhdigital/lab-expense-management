import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { loginSchema } from "@/lib/api/schemas/auth.schema";
import { loginUser } from "@/lib/services/auth.service";

export const POST = withApi(async (request) => {
  const input = await parseJsonBody(request, loginSchema);
  return ok(await loginUser(input));
});
