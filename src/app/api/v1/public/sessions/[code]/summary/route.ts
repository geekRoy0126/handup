// GET /api/v1/public/sessions/{code}/summary — public API (X-API-Key): totals, top and unanswered questions.
import { ok, toErrorResponse } from "@/lib/api/http";
import { findOwnedSession, preflightResponse, withCors } from "@/lib/server/public-api";
import { getSessionReport } from "@/lib/server/services/report-service";

type Context = RouteContext<"/api/v1/public/sessions/[code]/summary">;

export async function GET(req: Request, { params }: Context): Promise<Response> {
  try {
    const session = await findOwnedSession(req, (await params).code, new Date());
    const { polls: _polls, ...summary } = await getSessionReport(session);
    return withCors(ok(summary));
  } catch (err) {
    return withCors(toErrorResponse(err));
  }
}

export function OPTIONS(): Response {
  return preflightResponse();
}
