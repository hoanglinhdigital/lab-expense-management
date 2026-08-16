import { withAuth } from "@/lib/api/handler";
import { noContent } from "@/lib/api/response";
import { logoutUser } from "@/lib/services/auth.service";

export const POST = withAuth(async () => {
  await logoutUser();
  return noContent();
});
