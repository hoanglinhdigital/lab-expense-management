import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validation";
import { exchangeRateQuerySchema } from "@/lib/api/schemas/currency.schema";
import { listExchangeRates } from "@/lib/services/currency.service";

export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request.nextUrl, exchangeRateQuerySchema);

  const { data, meta } = await listExchangeRates({
    ...query,
    base: query.base ?? user.defaultCurrency,
  });

  return ok(data, meta);
});
