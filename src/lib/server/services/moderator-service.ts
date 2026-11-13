import "server-only";

import { ApiError } from "@/lib/api/http";
import { db } from "@/lib/server/db";
import { bumpSessionVersion } from "@/lib/server/realtime";

import type { SessionRow } from "./access";

export type ModeratorDto = { userId: string; name: string; email: string; addedAt: Date };

const select = { userId: true, addedAt: true, user: { select: { name: true, email: true } } } as const;

function toDto(row: { userId: string; addedAt: Date; user: { name: string; email: string } }): ModeratorDto {
  return { userId: row.userId, name: row.user.name, email: row.user.email, addedAt: row.addedAt };
}

/** Host adds an existing account as moderator of this session (PRD US6). Adding twice is harmless. */
export async function addModerator(session: SessionRow, email: string, now: Date): Promise<ModeratorDto> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new ApiError("NOT_FOUND", "No HandUp account with this email.");
  if (user.id === session.hostId) throw new ApiError("CONFLICT", "That's the host's own account.");
  // Bump the version so the new moderator's dashboard and every open console refetch (#62).
  const row = await db.$transaction(async (tx) => {
    const added = await tx.sessionModerator.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId: user.id } },
      create: { sessionId: session.id, userId: user.id, addedAt: now },
      update: {},
      select,
    });
    await bumpSessionVersion(tx, session.id);
    return added;
  });
  return toDto(row);
}

export async function listModerators(session: SessionRow): Promise<ModeratorDto[]> {
  const rows = await db.sessionModerator.findMany({ where: { sessionId: session.id }, select, orderBy: { addedAt: "asc" } });
  return rows.map(toDto);
}

export async function removeModerator(session: SessionRow, userId: string): Promise<void> {
  // A removed moderator's open console refetches at once and gets 403, instead of finding out on the next click (#62).
  await db.$transaction(async (tx) => {
    await tx.sessionModerator.deleteMany({ where: { sessionId: session.id, userId } });
    await bumpSessionVersion(tx, session.id);
  });
}
