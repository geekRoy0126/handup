import "server-only";

import { ApiError } from "@/lib/api/http";
import { db } from "@/lib/server/db";
import { bumpSessionVersion } from "@/lib/server/realtime";

import type { SessionRow } from "./access";

type VotableQuestion = { id: string; authorId: string; status: string; isHidden: boolean };

/** Toggles this guest's vote (PRD §4.2). Returns the new state and count. */
export async function toggleVote(
  session: SessionRow,
  question: VotableQuestion,
  guestId: string,
): Promise<{ voted: boolean; votes: number }> {
  if (session.status === "ENDED") throw new ApiError("CONFLICT", "This session has ended.");
  if (question.authorId === guestId) throw new ApiError("FORBIDDEN", "You can't vote on your own question.");
  if (question.status === "MERGED" || question.isHidden) {
    throw new ApiError("CONFLICT", "This question can't be voted on anymore.");
  }

  return db.$transaction(async (tx) => {
    const where = { questionId: question.id, guestId };
    // deleteMany + createMany(skipDuplicates) never throw on a concurrent toggle: two requests that both find
    // no vote both insert, and the second insert is a no-op (ON CONFLICT DO NOTHING) instead of a 500 (#40).
    const removed = await tx.vote.deleteMany({ where });
    const voted = removed.count === 0;
    if (voted) await tx.vote.createMany({ data: [where], skipDuplicates: true });
    await bumpSessionVersion(tx, session.id);
    const votes = await tx.vote.count({ where: { questionId: question.id } });
    return { voted, votes };
  });
}

/** Finds a question and the session it belongs to, or 404. */
export async function findQuestionWithSession(questionId: string) {
  const question = await db.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      authorId: true,
      status: true,
      isHidden: true,
      isPinned: true,
      session: { select: { id: true, code: true, title: true, status: true, hostId: true } },
    },
  });
  if (!question) throw new ApiError("NOT_FOUND", "No such question.");
  return question;
}
