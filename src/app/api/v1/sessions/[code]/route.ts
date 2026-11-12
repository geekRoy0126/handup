// GET /api/v1/sessions/{code} — public session info plus the caller's role in it.
import { ok, toErrorResponse } from "@/lib/api/http";
import { findSessionByCode, getViewer } from "@/lib/server/services/access";
import { getSessionDto } from "@/lib/server/services/session-service";

export async function GET(req: Request, { params }: RouteContext<"/api/v1/sessions/[code]">): Promise<Response> {
  try {
    const session = await findSessionByCode((await params).code);
    const viewer = await getViewer(req, session, new Date());
    return ok({ session: await getSessionDto(session), viewer: { role: viewer.role } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
