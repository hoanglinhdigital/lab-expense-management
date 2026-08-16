import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validation";
import { accountBalanceQuerySchema } from "@/lib/api/schemas/account.schema";
import { getAccountBalance } from "@/lib/services/account.service";

type Params = { accountId: string };

export const GET = withAuth<Params>(async (request, user, { accountId }) => {
  const query = parseQuery(request.nextUrl, accountBalanceQuerySchema);
  return ok(await getAccountBalance(user.id, accountId, query.asOf));
});
