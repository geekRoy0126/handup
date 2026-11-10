// GET /api/v1/api-keys — my keys (no secrets). POST { name } — create a key; the raw key is returned once.
import { ok, parseOrThrow, readJsonBody, toErrorResponse } from "@/lib/api/http";
import { requireUserId } from "@/lib/server/auth/request-auth";
import { createApiKey, listApiKeys } from "@/lib/server/services/api-key-service";
import { createApiKeySchema } from "@/lib/validation/api-key";

export async function GET(req: Request): Promise<Response> {
  try {
    const userId = await requireUserId(req, new Date());
    return ok({ apiKeys: await listApiKeys(userId) });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const now = new Date();
    const userId = await requireUserId(req, now);
    const { name } = parseOrThrow(createApiKeySchema, await readJsonBody(req));
    return ok(await createApiKey(userId, name, now), { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
