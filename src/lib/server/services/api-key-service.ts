import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { ApiError } from "@/lib/api/http";
import { API_KEY_PATTERN, apiKeyPrefix, generateApiKey } from "@/lib/domain/api-key";
import { db } from "@/lib/server/db";

export type ApiKeyDto = {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

const select = { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, revokedAt: true } as const;

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Returns the raw key exactly once; only its hash and prefix are stored. */
export async function createApiKey(ownerId: string, name: string, now: Date): Promise<{ key: string; apiKey: ApiKeyDto }> {
  const key = generateApiKey(randomBytes(32));
  const apiKey = await db.apiKey.create({
    data: { ownerId, name, prefix: apiKeyPrefix(key), hash: hashKey(key), createdAt: now },
    select,
  });
  return { key, apiKey };
}

export function listApiKeys(ownerId: string): Promise<ApiKeyDto[]> {
  return db.apiKey.findMany({ where: { ownerId }, select, orderBy: { createdAt: "desc" } });
}

export async function revokeApiKey(ownerId: string, id: string, now: Date): Promise<ApiKeyDto> {
  const found = await db.apiKey.findFirst({ where: { id, ownerId }, select: { id: true } });
  if (!found) throw new ApiError("NOT_FOUND", "No such API key.");
  return db.apiKey.update({ where: { id }, data: { revokedAt: now }, select });
}

/** The owner of a valid, unrevoked X-API-Key, or 401. */
export async function requireApiKeyOwner(req: Request, now: Date): Promise<string> {
  const key = req.headers.get("x-api-key")?.trim() ?? "";
  if (!API_KEY_PATTERN.test(key)) throw new ApiError("UNAUTHENTICATED", "Send a valid X-API-Key header.");
  const found = await db.apiKey.findUnique({
    where: { hash: hashKey(key) },
    select: { id: true, ownerId: true, revokedAt: true },
  });
  if (!found || found.revokedAt) throw new ApiError("UNAUTHENTICATED", "This API key is unknown or revoked.");
  await db.apiKey.update({ where: { id: found.id }, data: { lastUsedAt: now } });
  return found.ownerId;
}
