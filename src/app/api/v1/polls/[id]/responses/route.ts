// POST /api/v1/polls/{id}/responses { optionId } — a guest answers (or changes their answer) while open.
import { ok, parseOrThrow, readJsonBody, toErrorResponse } from "@/lib/api/http";
import { requireGuest } from "@/lib/server/services/access";
import { findPollWithSession, respondToPoll } from "@/lib/server/services/poll-service";
import { pollResponseSchema } from "@/lib/validation/poll";

export async function POST(req: Request, { params }: RouteContext<"/api/v1/polls/[id]/responses">): Promise<Response> {
  try {
    const poll = await findPollWithSession((await params).id);
    const { guestId } = await requireGuest(req, poll.session, new Date());
    const { optionId } = parseOrThrow(pollResponseSchema, await readJsonBody(req));
    return ok({ poll: await respondToPoll(poll, guestId, optionId) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
