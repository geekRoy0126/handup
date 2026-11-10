// POST /api/v1/auth/logout — clear the session cookie. JWTs are stateless, so API clients just drop their token.
import { ok } from "@/lib/api/http";
import { clearCookie, USER_COOKIE } from "@/lib/server/auth/cookies";

export function POST(_req: Request): Response {
  return clearCookie(ok({ loggedOut: true }), USER_COOKIE);
}
