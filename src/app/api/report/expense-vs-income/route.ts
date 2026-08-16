import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validation";
import { expenseVsIncomeQuerySchema } from "@/lib/api/schemas/report.schema";
import { getExpenseVsIncome } from "@/lib/services/report.service";

export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request.nextUrl, expenseVsIncomeQuerySchema);
  return ok(await getExpenseVsIncome(user.id, user.defaultCurrency, query));
});
