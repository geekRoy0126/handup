// POST /api/v1/sessions/{code}/end — host ends the session (PRD US2).
import { ok, toErrorResponse } from "@/lib/api/http";
import { findSessionByCode, requireHost } from "@/lib/server/services/access";
import { endSession } from "@/lib/server/services/session-service";

export async function POST(req: Request, { params }: RouteContext<"/api/v1/sessions/[code]/end">): Promise<Response> {
  try {
    const now = new Date();
    const session = await findSessionByCode((await params).code);
    await requireHost(req, session, now);
    return ok({ session: await endSession(session, now) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
