import { withAuth } from "@/lib/api/handler";
import { noContent, ok } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { updateAccountSchema } from "@/lib/api/schemas/account.schema";
import {
  deleteAccount,
  getAccount,
  updateAccount,
} from "@/lib/services/account.service";

type Params = { accountId: string };

export const GET = withAuth<Params>(async (_request, user, { accountId }) => {
  return ok(await getAccount(user.id, accountId));
});

export const PATCH = withAuth<Params>(async (request, user, { accountId }) => {
  const input = await parseJsonBody(request, updateAccountSchema);
  return ok(await updateAccount(user.id, accountId, input));
});

export const DELETE = withAuth<Params>(async (_request, user, { accountId }) => {
  await deleteAccount(user.id, accountId);
  return noContent();
});
