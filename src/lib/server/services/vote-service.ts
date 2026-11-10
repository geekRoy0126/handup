import "server-only";

import { ApiError } from "@/lib/api/http";
import { db } from "@/lib/server/db";
import { bumpSessionVersion } from "@/lib/server/realtime";
import { lockQuestions } from "@/lib/server/locks";

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
  const notVotable = (q: { status: string; isHidden: boolean }) => q.status === "MERGED" || q.isHidden;
  if (notVotable(question)) throw new ApiError("CONFLICT", "This question can't be voted on anymore.");

  // Lock the question and re-read it: a merge running at the same moment waits for this vote (and moves it),
  // or finishes first and this vote is refused. Either way no vote is silently lost (#9).
  return db.$transaction(async (tx) => {
    await lockQuestions(tx, [question.id]);
    const current = await tx.question.findUniqueOrThrow({ where: { id: question.id }, select: { status: true, isHidden: true } });
    if (notVotable(current)) throw new ApiError("CONFLICT", "This question can't be voted on anymore.");
    const key = { questionId_guestId: { questionId: question.id, guestId } };
    const existing = await tx.vote.findUnique({ where: key, select: { guestId: true } });
    if (existing) await tx.vote.delete({ where: key });
    else await tx.vote.create({ data: { questionId: question.id, guestId } });
    await bumpSessionVersion(tx, session.id);
    const votes = await tx.vote.count({ where: { questionId: question.id } });
    return { voted: !existing, votes };
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
