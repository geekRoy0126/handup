// GET /api/v1/sessions/{code}/questions — the board for this viewer. POST — a guest asks (PRD US3).
import { ok, parseOrThrow, readJsonBody, toErrorResponse } from "@/lib/api/http";
import { findSessionByCode, requireGuest, requireParticipant } from "@/lib/server/services/access";
import { askQuestion, listQuestions } from "@/lib/server/services/question-service";
import { askQuestionSchema } from "@/lib/validation/question";

type Context = RouteContext<"/api/v1/sessions/[code]/questions">;

export async function GET(req: Request, { params }: Context): Promise<Response> {
  try {
    const session = await findSessionByCode((await params).code);
    const viewer = await requireParticipant(req, session, new Date());
    const questions = await listQuestions(
      session,
      viewer.role === "GUEST" ? { role: "GUEST", guestId: viewer.guestId } : { role: "STAFF" },
    );
    return ok({ questions });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: Context): Promise<Response> {
  try {
    const now = new Date();
    const session = await findSessionByCode((await params).code);
    const { guestId } = await requireGuest(req, session, now);
    const input = parseOrThrow(askQuestionSchema, await readJsonBody(req));
    return ok({ question: await askQuestion(session, guestId, input, now) }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
