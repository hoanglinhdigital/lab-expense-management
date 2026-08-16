import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validation";
import { accountSummaryQuerySchema } from "@/lib/api/schemas/account.schema";
import { getAccountSummary } from "@/lib/services/account.service";

export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request.nextUrl, accountSummaryQuerySchema);
  return ok(
    await getAccountSummary(user.id, user.defaultCurrency, query.currency),
  );
});
