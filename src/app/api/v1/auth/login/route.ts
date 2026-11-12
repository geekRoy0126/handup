// POST /api/v1/auth/login — exchange email + password for a JWT (cookie for browsers, token for API clients).
import { ok, parseOrThrow, readJsonBody, toErrorResponse } from "@/lib/api/http";
import { setCookie, USER_COOKIE, USER_COOKIE_MAX_AGE } from "@/lib/server/auth/cookies";
import { loginUser } from "@/lib/server/services/auth-service";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(req: Request): Promise<Response> {
  try {
    const input = parseOrThrow(loginSchema, await readJsonBody(req));
    const result = await loginUser(input, new Date());
    return setCookie(ok(result), USER_COOKIE, result.token, USER_COOKIE_MAX_AGE);
  } catch (err) {
    return toErrorResponse(err);
  }
}
