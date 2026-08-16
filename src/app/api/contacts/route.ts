import { withAuth } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { parseJsonBody, parseQuery } from "@/lib/api/validation";
import {
  createContactSchema,
  listContactsQuerySchema,
} from "@/lib/api/schemas/contact.schema";
import { createContact, listContacts } from "@/lib/services/contact.service";

export const GET = withAuth(async (request, user) => {
  const query = parseQuery(request.nextUrl, listContactsQuerySchema);
  const { data, meta } = await listContacts(user.id, user.defaultCurrency, query);
  return ok(data, meta);
});

export const POST = withAuth(async (request, user) => {
  const input = await parseJsonBody(request, createContactSchema);
  return created(await createContact(user.id, input));
});
