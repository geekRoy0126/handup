// GET /api/v1/auth/me — the signed-in user.
import { ok, toErrorResponse } from "@/lib/api/http";
import { requireUserId } from "@/lib/server/auth/request-auth";
import { getUser } from "@/lib/server/services/auth-service";

export async function GET(req: Request): Promise<Response> {
  try {
    const userId = await requireUserId(req, new Date());
    return ok({ user: await getUser(userId) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
