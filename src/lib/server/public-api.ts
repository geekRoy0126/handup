import "server-only";

import { ApiError } from "@/lib/api/http";
import { findSessionByCode, type SessionRow } from "@/lib/server/services/access";
import { requireApiKeyOwner } from "@/lib/server/services/api-key-service";

// Public API helpers (PRD §4.6): read-only, any origin may call it (keys are the access control).
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "X-API-Key, Content-Type",
  "access-control-max-age": "86400",
};

export function withCors(res: Response): Response {
  for (const [name, value] of Object.entries(CORS_HEADERS)) res.headers.set(name, value);
  return res;
}

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** A session owned by the key owner. Anything else is 404, so join codes cannot be probed. */
export async function findOwnedSession(req: Request, code: string, now: Date): Promise<SessionRow> {
  const ownerId = await requireApiKeyOwner(req, now);
  const session = await findSessionByCode(code);
  if (session.hostId !== ownerId) throw new ApiError("NOT_FOUND", "No session with that code.");
  return session;
}
