import { withAuth } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { parseJsonBody, parseQuery } from "@/lib/api/validation";
import {
  listTransactionsQuerySchema,
  transactionBodySchema,
} from "@/lib/api/schemas/transaction.schema";
import {
  createTransaction,
  listTransactions,
} from "@/lib/services/transaction.service";

export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request.nextUrl, listTransactionsQuerySchema);
  const { data, meta } = await listTransactions(
    user.id,
    user.defaultCurrency,
    query,
  );
  return ok(data, meta);
});

export const POST = withAuth(async (request, user) => {
  const input = await parseJsonBody(request, transactionBodySchema);
  return created(await createTransaction(user.id, input));
});
