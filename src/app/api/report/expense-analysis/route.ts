import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validation";
import { expenseAnalysisQuerySchema } from "@/lib/api/schemas/report.schema";
import { getExpenseAnalysis } from "@/lib/services/report.service";

export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request.nextUrl, expenseAnalysisQuerySchema);
  const { data, meta } = await getExpenseAnalysis(
    user.id,
    user.defaultCurrency,
    query,
  );
  return ok(data, meta);
});
