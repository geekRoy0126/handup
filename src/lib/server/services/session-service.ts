import "server-only";

import { ApiError } from "@/lib/api/http";
import { generateJoinCode } from "@/lib/domain/join-code";
import { db } from "@/lib/server/db";
import { lockSessionForStaffWrite } from "@/lib/server/locks";
import { bumpSessionVersion } from "@/lib/server/realtime";
import type { CreateSession } from "@/lib/validation/session";

import type { SessionRow, StaffRole } from "./access";

export type SessionDto = {
  code: string;
  title: string;
  status: "LIVE" | "ENDED";
  createdAt: Date;
  endedAt: Date | null;
};
export type MySessionDto = SessionDto & { role: StaffRole };

const dtoSelect = { code: true, title: true, status: true, createdAt: true, endedAt: true } as const;
const MAX_CODE_ATTEMPTS = 10;

export async function createSession(
  input: CreateSession & { hostId: string },
  now: Date,
  random: () => number = Math.random,
): Promise<SessionDto> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateJoinCode(random);
    const taken = await db.session.findUnique({ where: { code }, select: { id: true } });
    if (taken) continue;
    return db.session.create({
      data: { code, title: input.title, hostId: input.hostId, createdAt: now },
      select: dtoSelect,
    });
  }
  throw new ApiError("CONFLICT", "Could not find a free join code. Try again.");
}

/** Sessions I host plus sessions I moderate, newest first. */
export async function listMySessions(userId: string): Promise<MySessionDto[]> {
  const [hosted, moderated] = await Promise.all([
    db.session.findMany({ where: { hostId: userId }, select: dtoSelect }),
    db.session.findMany({ where: { moderators: { some: { userId } } }, select: dtoSelect }),
  ]);
  return [
    ...hosted.map((s) => ({ ...s, role: "HOST" as const })),
    ...moderated.map((s) => ({ ...s, role: "MODERATOR" as const })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getSessionDto(session: SessionRow): Promise<SessionDto> {
  return db.session.findUniqueOrThrow({ where: { id: session.id }, select: dtoSelect });
}

export async function endSession(session: SessionRow, now: Date): Promise<SessionDto> {
  if (session.status === "ENDED") return getSessionDto(session);
  return db.$transaction(async (tx) => {
    // Takes the staff lock so no poll launch or staff action slips in while the session ends, and closes the open
    // poll in the same transaction: an ended session is final (PRD §4.5, #60).
    await lockSessionForStaffWrite(tx, session.id);
    await tx.poll.updateMany({ where: { sessionId: session.id, status: "OPEN" }, data: { status: "CLOSED", closedAt: now } });
    await bumpSessionVersion(tx, session.id);
    return tx.session.update({ where: { id: session.id }, data: { status: "ENDED", endedAt: now }, select: dtoSelect });
  });
}
