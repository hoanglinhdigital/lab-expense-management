import { withAuth } from "@/lib/api/handler";
import { noContent, ok } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { updateContactSchema } from "@/lib/api/schemas/contact.schema";
import {
  deleteContact,
  getContact,
  updateContact,
} from "@/lib/services/contact.service";

type Params = { contactId: string };

export const GET = withAuth<Params>(async (_request, user, { contactId }) => {
  return ok(await getContact(user.id, user.defaultCurrency, contactId));
});

export const PATCH = withAuth<Params>(async (request, user, { contactId }) => {
  const input = await parseJsonBody(request, updateContactSchema);
  return ok(
    await updateContact(user.id, user.defaultCurrency, contactId, input),
  );
});

export const DELETE = withAuth<Params>(async (_request, user, { contactId }) => {
  await deleteContact(user.id, contactId);
  return noContent();
});
