// GET /api/v1/sessions/{code}/report — totals, top and unanswered questions, poll results (host + moderators).
import { ok, toErrorResponse } from "@/lib/api/http";
import { findSessionByCode, requireStaff } from "@/lib/server/services/access";
import { getSessionReport } from "@/lib/server/services/report-service";

export async function GET(req: Request, { params }: RouteContext<"/api/v1/sessions/[code]/report">): Promise<Response> {
  try {
    const session = await findSessionByCode((await params).code);
    await requireStaff(req, session, new Date());
    return ok({ report: await getSessionReport(session) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
