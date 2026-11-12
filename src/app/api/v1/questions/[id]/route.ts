// PATCH /api/v1/questions/{id} — staff action on a question: { "action": "pin" | "unpin" | "answer" | "reopen" }.
import { ok, parseOrThrow, readJsonBody, toErrorResponse } from "@/lib/api/http";
import { requireStaff } from "@/lib/server/services/access";
import { applyQuestionAction } from "@/lib/server/services/moderation-service";
import { findQuestionWithSession } from "@/lib/server/services/vote-service";
import { questionActionSchema } from "@/lib/validation/question";

export async function PATCH(req: Request, { params }: RouteContext<"/api/v1/questions/[id]">): Promise<Response> {
  try {
    const now = new Date();
    const question = await findQuestionWithSession((await params).id);
    await requireStaff(req, question.session, now);
    const { action } = parseOrThrow(questionActionSchema, await readJsonBody(req));
    return ok({ question: await applyQuestionAction(question, action, now) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
