// GET /api/v1/sessions/{code}/polls — polls with results the viewer may see. POST — host launches a poll (PRD US8).
import { ok, parseOrThrow, readJsonBody, toErrorResponse } from "@/lib/api/http";
import { findSessionByCode, requireHost, requireParticipant } from "@/lib/server/services/access";
import { createPoll, listPolls } from "@/lib/server/services/poll-service";
import { createPollSchema } from "@/lib/validation/poll";

type Context = RouteContext<"/api/v1/sessions/[code]/polls">;

export async function GET(req: Request, { params }: Context): Promise<Response> {
  try {
    const session = await findSessionByCode((await params).code);
    const viewer = await requireParticipant(req, session, new Date());
    const polls = await listPolls(
      session,
      viewer.role === "GUEST" ? { role: "GUEST", guestId: viewer.guestId } : { role: "STAFF" },
    );
    return ok({ polls });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: Context): Promise<Response> {
  try {
    const now = new Date();
    const session = await findSessionByCode((await params).code);
    await requireHost(req, session, now);
    const input = parseOrThrow(createPollSchema, await readJsonBody(req));
    return ok({ poll: await createPoll(session, input, now) }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
