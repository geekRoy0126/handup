// POST /api/v1/questions/{id}/merge { targetId } — staff merge a duplicate into another question (PRD US7).
import { ok, parseOrThrow, readJsonBody, toErrorResponse } from "@/lib/api/http";
import { requireStaff } from "@/lib/server/services/access";
import { mergeQuestion } from "@/lib/server/services/moderation-service";
import { findQuestionWithSession } from "@/lib/server/services/vote-service";
import { mergeQuestionSchema } from "@/lib/validation/question";

export async function POST(req: Request, { params }: RouteContext<"/api/v1/questions/[id]/merge">): Promise<Response> {
  try {
    const source = await findQuestionWithSession((await params).id);
    await requireStaff(req, source.session, new Date());
    const { targetId } = parseOrThrow(mergeQuestionSchema, await readJsonBody(req));
    return ok(await mergeQuestion(source.session.id, source.id, targetId));
  } catch (err) {
    return toErrorResponse(err);
  }
}
