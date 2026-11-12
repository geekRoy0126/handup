// POST /api/v1/questions/{id}/vote — a guest toggles their upvote (PRD US4).
import { ok, toErrorResponse } from "@/lib/api/http";
import { requireGuest } from "@/lib/server/services/access";
import { findQuestionWithSession, toggleVote } from "@/lib/server/services/vote-service";

export async function POST(req: Request, { params }: RouteContext<"/api/v1/questions/[id]/vote">): Promise<Response> {
  try {
    const question = await findQuestionWithSession((await params).id);
    const { guestId } = await requireGuest(req, question.session, new Date());
    return ok(await toggleVote(question.session, question, guestId));
  } catch (err) {
    return toErrorResponse(err);
  }
}
