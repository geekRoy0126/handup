// POST /api/v1/sessions/{code}/join — become a guest of a LIVE session (sets the hu_guest cookie, PRD US3).
import { ok, toErrorResponse } from "@/lib/api/http";
import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE, setCookie } from "@/lib/server/auth/cookies";
import { getGuestClaims } from "@/lib/server/auth/request-auth";
import { findSessionByCode } from "@/lib/server/services/access";
import { joinSession } from "@/lib/server/services/guest-service";

export async function POST(req: Request, { params }: RouteContext<"/api/v1/sessions/[code]/join">): Promise<Response> {
  try {
    const now = new Date();
    const session = await findSessionByCode((await params).code);
    const claims = await getGuestClaims(req, now);
    const existingGuestId = claims?.sessionId === session.id ? claims.guestId : null;
    const { guest, token } = await joinSession(session, existingGuestId, now);
    return setCookie(ok({ guest, token }), GUEST_COOKIE, token, GUEST_COOKIE_MAX_AGE);
  } catch (err) {
    return toErrorResponse(err);
  }
}
