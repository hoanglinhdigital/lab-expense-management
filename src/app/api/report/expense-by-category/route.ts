import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validation";
import { expenseByCategoryQuerySchema } from "@/lib/api/schemas/report.schema";
import { getExpenseByCategory } from "@/lib/services/report.service";

export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request.nextUrl, expenseByCategoryQuerySchema);
  const { data, meta } = await getExpenseByCategory(
    user.id,
    user.defaultCurrency,
    query,
  );
  return ok(data, meta);
});
