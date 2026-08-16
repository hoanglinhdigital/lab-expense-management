import { withAuth } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { parseJsonBody, parseQuery } from "@/lib/api/validation";
import {
  createAccountSchema,
  listAccountsQuerySchema,
} from "@/lib/api/schemas/account.schema";
import { createAccount, listAccounts } from "@/lib/services/account.service";

export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request.nextUrl, listAccountsQuerySchema);
  const { data, meta } = await listAccounts(user.id, query);
  return ok(data, meta);
});

export const POST = withAuth(async (request, user) => {
  const input = await parseJsonBody(request, createAccountSchema);
  return created(await createAccount(user.id, input));
});
