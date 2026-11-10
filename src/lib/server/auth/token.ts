import "server-only";

import { jwtVerify, SignJWT } from "jose";

// JWTs for hosts/moderators ("user") and audience members ("guest"); see docs/PRD.md §3.
export type TokenClaims = { kind: "user"; sub: string } | { kind: "guest"; sub: string; sid: string };

const USER_TOKEN_SECONDS = 7 * 24 * 60 * 60;
const GUEST_TOKEN_SECONDS = 24 * 60 * 60;
const MIN_SECRET_LENGTH = 32;

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
  return new TextEncoder().encode(secret);
}

async function sign(claims: Record<string, string>, subject: string, now: Date, ttlSeconds: number) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ttlSeconds)
    .sign(getJwtSecret());
}

export function signUserToken(userId: string, now: Date): Promise<string> {
  return sign({ kind: "user" }, userId, now, USER_TOKEN_SECONDS);
}

export function signGuestToken(guestId: string, sessionId: string, now: Date): Promise<string> {
  return sign({ kind: "guest", sid: sessionId }, guestId, now, GUEST_TOKEN_SECONDS);
}

/** Returns the claims of a valid token, or null for anything expired, forged or malformed. */
export async function verifyToken(token: string, now: Date): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"], currentDate: now });
    if (typeof payload.sub !== "string") return null;
    if (payload.kind === "user") return { kind: "user", sub: payload.sub };
    if (payload.kind === "guest" && typeof payload.sid === "string") {
      return { kind: "guest", sub: payload.sub, sid: payload.sid };
    }
    return null;
  } catch {
    return null;
  }
}
