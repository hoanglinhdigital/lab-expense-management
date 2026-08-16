import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validation";
import { moneyLendBorrowQuerySchema } from "@/lib/api/schemas/report.schema";
import { getMoneyLendBorrow } from "@/lib/services/report.service";

export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request.nextUrl, moneyLendBorrowQuerySchema);
  const { data, meta } = await getMoneyLendBorrow(
    user.id,
    user.defaultCurrency,
    query,
  );
  return ok(data, meta);
});
