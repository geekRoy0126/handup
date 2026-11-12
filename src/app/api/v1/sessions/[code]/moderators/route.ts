// GET /api/v1/sessions/{code}/moderators — list (host). POST { email } — add a moderator (host only, PRD US6).
import { ok, parseOrThrow, readJsonBody, toErrorResponse } from "@/lib/api/http";
import { findSessionByCode, requireHost } from "@/lib/server/services/access";
import { addModerator, listModerators } from "@/lib/server/services/moderator-service";
import { inviteModeratorSchema } from "@/lib/validation/moderator";

type Context = RouteContext<"/api/v1/sessions/[code]/moderators">;

export async function GET(req: Request, { params }: Context): Promise<Response> {
  try {
    const session = await findSessionByCode((await params).code);
    await requireHost(req, session, new Date());
    return ok({ moderators: await listModerators(session) });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: Context): Promise<Response> {
  try {
    const now = new Date();
    const session = await findSessionByCode((await params).code);
    await requireHost(req, session, now);
    const { email } = parseOrThrow(inviteModeratorSchema, await readJsonBody(req));
    return ok({ moderator: await addModerator(session, email, now) }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
