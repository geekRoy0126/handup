// DELETE /api/v1/api-keys/{id} — revoke one of my keys.
import { ok, toErrorResponse } from "@/lib/api/http";
import { requireUserId } from "@/lib/server/auth/request-auth";
import { revokeApiKey } from "@/lib/server/services/api-key-service";

export async function DELETE(req: Request, { params }: RouteContext<"/api/v1/api-keys/[id]">): Promise<Response> {
  try {
    const now = new Date();
    const userId = await requireUserId(req, now);
    return ok({ apiKey: await revokeApiKey(userId, (await params).id, now) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
