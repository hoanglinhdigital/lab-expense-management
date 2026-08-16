import { withApi } from "@/lib/api/handler";
import { created } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { registerSchema } from "@/lib/api/schemas/auth.schema";
import { registerUser } from "@/lib/services/auth.service";

export const POST = withApi(async (request) => {
  const input = await parseJsonBody(request, registerSchema);
  return created(await registerUser(input));
});
