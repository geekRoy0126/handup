// POST /api/v1/polls/{id}/close — host closes the poll; results become final.
import { ok, toErrorResponse } from "@/lib/api/http";
import { requireHost } from "@/lib/server/services/access";
import { closePoll, findPollWithSession } from "@/lib/server/services/poll-service";

export async function POST(req: Request, { params }: RouteContext<"/api/v1/polls/[id]/close">): Promise<Response> {
  try {
    const now = new Date();
    const poll = await findPollWithSession((await params).id);
    await requireHost(req, poll.session, now);
    return ok({ poll: await closePoll(poll, now) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
