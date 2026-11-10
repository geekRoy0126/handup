import "server-only";

import { ApiError } from "@/lib/api/http";
import { signGuestToken } from "@/lib/server/auth/token";
import { db } from "@/lib/server/db";

import type { SessionRow } from "./access";

export type GuestDto = { id: string; displayName: string | null };

/** Joins a LIVE session. Reuses the guest from a still-valid pass for this session, so votes stay theirs. */
export async function joinSession(
  session: SessionRow,
  existingGuestId: string | null,
  now: Date,
): Promise<{ guest: GuestDto; token: string }> {
  if (session.status === "ENDED") throw new ApiError("CONFLICT", "This session has ended.");
  const select = { id: true, displayName: true } as const;
  const existing = existingGuestId
    ? await db.guest.findFirst({ where: { id: existingGuestId, sessionId: session.id }, select })
    : null;
  const guest = existing ?? (await db.guest.create({ data: { sessionId: session.id, createdAt: now }, select }));
  return { guest, token: await signGuestToken(guest.id, session.id, now) };
}
