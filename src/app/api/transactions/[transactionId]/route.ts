import { withAuth } from "@/lib/api/handler";
import { noContent, ok } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { transactionBodySchema } from "@/lib/api/schemas/transaction.schema";
import {
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from "@/lib/services/transaction.service";

type Params = { transactionId: string };

export const GET = withAuth<Params>(async (_request, user, { transactionId }) => {
  return ok(await getTransaction(user.id, transactionId));
});

export const PATCH = withAuth<Params>(async (request, user, { transactionId }) => {
  // Sửa giao dịch là gửi lại toàn bộ trạng thái mong muốn — cùng shape với POST.
  const input = await parseJsonBody(request, transactionBodySchema);
  return ok(await updateTransaction(user.id, transactionId, input));
});

export const DELETE = withAuth<Params>(async (_request, user, { transactionId }) => {
  await deleteTransaction(user.id, transactionId);
  return noContent();
});
