// POST /api/v1/auth/register — create a host account and sign in (PRD US1).
import { ok, parseOrThrow, readJsonBody, toErrorResponse } from "@/lib/api/http";
import { setCookie, USER_COOKIE, USER_COOKIE_MAX_AGE } from "@/lib/server/auth/cookies";
import { registerUser } from "@/lib/server/services/auth-service";
import { registerSchema } from "@/lib/validation/auth";

export async function POST(req: Request): Promise<Response> {
  try {
    const input = parseOrThrow(registerSchema, await readJsonBody(req));
    const result = await registerUser(input, new Date());
    return setCookie(ok(result, { status: 201 }), USER_COOKIE, result.token, USER_COOKIE_MAX_AGE);
  } catch (err) {
    return toErrorResponse(err);
  }
}
