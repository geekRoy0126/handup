import "server-only";

import { ApiError } from "@/lib/api/http";
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
