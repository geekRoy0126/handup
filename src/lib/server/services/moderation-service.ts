import "server-only";

import { ApiError } from "@/lib/api/http";
import { mergeVotes } from "@/lib/domain/merge-votes";
import { planQuestionAction, type QuestionAction } from "@/lib/domain/question-actions";
import { db } from "@/lib/server/db";
import { bumpSessionVersion } from "@/lib/server/realtime";

type TargetQuestion = {
  id: string;
  status: "OPEN" | "ANSWERED" | "MERGED";
  isPinned: boolean;
  isHidden: boolean;
  session: { id: string; status: "LIVE" | "ENDED" };
};

/** Applies a staff action (pin, answer, hide…) in one transaction and notifies live screens. */
export async function applyQuestionAction(question: TargetQuestion, action: QuestionAction, now: Date) {
  const result = planQuestionAction(question, action, now);
  if (!result.ok) throw new ApiError("CONFLICT", result.reason);

  return db.$transaction(async (tx) => {
    if (result.unpinOthers) {
      await tx.question.updateMany({
        where: { sessionId: question.session.id, isPinned: true, id: { not: question.id } },
        data: { isPinned: false },
      });
    }
    const updated = await tx.question.update({
      where: { id: question.id },
      data: result.data,
      select: { id: true, status: true, isPinned: true, isHidden: true, answeredAt: true },
    });
    await bumpSessionVersion(tx, question.session.id);
    return updated;
  });
}

/** Merges `sourceId` into `targetId` (PRD US7): moves votes without double counting, marks the source MERGED. */
export async function mergeQuestion(sessionId: string, sourceId: string, targetId: string) {
  if (sourceId === targetId) throw new ApiError("CONFLICT", "A question can't be merged into itself.");
  const select = { id: true, sessionId: true, status: true, authorId: true, votes: { select: { guestId: true } } } as const;
  const [source, target] = await Promise.all([
    db.question.findUnique({ where: { id: sourceId }, select }),
    db.question.findUnique({ where: { id: targetId }, select }),
  ]);
  if (!source || !target || target.sessionId !== sessionId || source.sessionId !== sessionId) {
    throw new ApiError("NOT_FOUND", "No such question in this session.");
  }
  if (source.status === "MERGED" || target.status === "MERGED") {
    throw new ApiError("CONFLICT", "One of these questions was already merged.");
  }

  const { move } = mergeVotes({
    sourceVoterIds: source.votes.map((v) => v.guestId),
    targetVoterIds: target.votes.map((v) => v.guestId),
    targetAuthorId: target.authorId,
  });

  return db.$transaction(async (tx) => {
    await tx.vote.deleteMany({ where: { questionId: source.id } });
    if (move.length > 0) await tx.vote.createMany({ data: move.map((guestId) => ({ questionId: target.id, guestId })) });
    await tx.question.update({
      where: { id: source.id },
      data: { status: "MERGED", mergedIntoId: target.id, isPinned: false },
    });
    await bumpSessionVersion(tx, sessionId);
    return { mergedId: source.id, targetId: target.id, movedVotes: move.length };
  });
}
