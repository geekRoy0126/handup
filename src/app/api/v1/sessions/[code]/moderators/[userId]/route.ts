// DELETE /api/v1/sessions/{code}/moderators/{userId} — host removes a moderator.
import { ok, toErrorResponse } from "@/lib/api/http";
import { findSessionByCode, requireHost } from "@/lib/server/services/access";
import { removeModerator } from "@/lib/server/services/moderator-service";

export async function DELETE(
  req: Request,
  { params }: RouteContext<"/api/v1/sessions/[code]/moderators/[userId]">,
): Promise<Response> {
  try {
    const { code, userId } = await params;
    const session = await findSessionByCode(code);
    await requireHost(req, session, new Date());
    await removeModerator(session, userId);
    return ok({ removed: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
