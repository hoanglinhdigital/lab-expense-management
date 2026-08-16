import { withAuth } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseQuery } from "@/lib/api/validation";
import { listCurrenciesQuerySchema } from "@/lib/api/schemas/currency.schema";
import { listCurrencies } from "@/lib/services/currency.service";

export const GET = withAuth(async (request) => {
  const query = parseQuery(request.nextUrl, listCurrenciesQuerySchema);
  const { data, meta } = await listCurrencies(query);

  // Dữ liệu tham chiếu giống nhau với mọi user và rất ít khi đổi.
  return ok(data, meta, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
});
