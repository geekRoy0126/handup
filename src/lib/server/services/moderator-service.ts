import "server-only";

import { ApiError } from "@/lib/api/http";
import { db } from "@/lib/server/db";

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
  const row = await db.sessionModerator.upsert({
    where: { sessionId_userId: { sessionId: session.id, userId: user.id } },
    create: { sessionId: session.id, userId: user.id, addedAt: now },
    update: {},
    select,
  });
  return toDto(row);
}

export async function listModerators(session: SessionRow): Promise<ModeratorDto[]> {
  const rows = await db.sessionModerator.findMany({ where: { sessionId: session.id }, select, orderBy: { addedAt: "asc" } });
  return rows.map(toDto);
}

export async function removeModerator(session: SessionRow, userId: string): Promise<void> {
  await db.sessionModerator.deleteMany({ where: { sessionId: session.id, userId } });
}
