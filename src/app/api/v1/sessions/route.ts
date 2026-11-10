// GET /api/v1/sessions — sessions I host or moderate. POST — create a session (PRD US2).
import { ok, parseOrThrow, readJsonBody, toErrorResponse } from "@/lib/api/http";
import { requireUserId } from "@/lib/server/auth/request-auth";
import { createSession, listMySessions } from "@/lib/server/services/session-service";
import { createSessionSchema } from "@/lib/validation/session";

export async function GET(req: Request): Promise<Response> {
  try {
    const userId = await requireUserId(req, new Date());
    return ok({ sessions: await listMySessions(userId) });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const now = new Date();
    const userId = await requireUserId(req, now);
    const input = parseOrThrow(createSessionSchema, await readJsonBody(req));
    return ok({ session: await createSession({ ...input, hostId: userId }, now) }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
