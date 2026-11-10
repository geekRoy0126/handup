import "server-only";

import { ApiError } from "@/lib/api/http";

import { GUEST_COOKIE, readCookie, USER_COOKIE } from "./cookies";
import { verifyToken } from "./token";

function bearerToken(req: Request): string | undefined {
  const header = req.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : undefined;
}

/** The signed-in user's id from `Authorization: Bearer` or the hu_session cookie, or null. */
export async function getUserId(req: Request, now: Date): Promise<string | null> {
  for (const token of [bearerToken(req), readCookie(req, USER_COOKIE)]) {
    if (!token) continue;
    const claims = await verifyToken(token, now);
    if (claims?.kind === "user") return claims.sub;
  }
  return null;
}

export async function requireUserId(req: Request, now: Date): Promise<string> {
  const userId = await getUserId(req, now);
  if (!userId) throw new ApiError("UNAUTHENTICATED", "Please log in.");
  return userId;
}

/** The guest from the hu_guest cookie (or Bearer guest token), or null. Session match is checked by services. */
export async function getGuestClaims(req: Request, now: Date): Promise<{ guestId: string; sessionId: string } | null> {
  for (const token of [readCookie(req, GUEST_COOKIE), bearerToken(req)]) {
    if (!token) continue;
    const claims = await verifyToken(token, now);
    if (claims?.kind === "guest") return { guestId: claims.sub, sessionId: claims.sid };
  }
  return null;
}
