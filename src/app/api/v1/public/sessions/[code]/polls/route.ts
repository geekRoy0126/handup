// GET /api/v1/public/sessions/{code}/polls — public API (X-API-Key): every poll with its results.
import { ok, toErrorResponse } from "@/lib/api/http";
import { findOwnedSession, preflightResponse, withCors } from "@/lib/server/public-api";
import { getSessionReport } from "@/lib/server/services/report-service";

type Context = RouteContext<"/api/v1/public/sessions/[code]/polls">;

export async function GET(req: Request, { params }: Context): Promise<Response> {
  try {
    const session = await findOwnedSession(req, (await params).code, new Date());
    const { polls } = await getSessionReport(session);
    return withCors(ok({ polls }));
  } catch (err) {
    return withCors(toErrorResponse(err));
  }
}

export function OPTIONS(): Response {
  return preflightResponse();
}
