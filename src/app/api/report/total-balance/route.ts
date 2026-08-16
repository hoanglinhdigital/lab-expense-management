import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validation";
import { totalBalanceQuerySchema } from "@/lib/api/schemas/report.schema";
import { getTotalBalance } from "@/lib/services/report.service";

export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request.nextUrl, totalBalanceQuerySchema);
  return ok(await getTotalBalance(user.id, user.defaultCurrency, query));
});
