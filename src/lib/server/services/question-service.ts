import "server-only";

import { ApiError } from "@/lib/api/http";
import {
  toQuestionView,
  type QuestionRecord,
  type QuestionView,
  type QuestionViewer,
  type StaffQuestionView,
} from "@/lib/domain/question-view";
import { rankQuestions } from "@/lib/domain/rank-questions";
import { db } from "@/lib/server/db";
import { bumpSessionVersion } from "@/lib/server/realtime";
import type { AskQuestion } from "@/lib/validation/question";

import type { SessionRow } from "./access";

export const MAX_QUESTIONS_PER_MINUTE = 5;
const RATE_WINDOW_MS = 60_000;

const recordInclude = {
  author: { select: { displayName: true } },
  votes: { select: { guestId: true } },
  _count: { select: { merged: true } },
} as const;

type RecordRow = Awaited<ReturnType<typeof loadRecords>>[number];

function loadRecords(where: { sessionId: string } | { id: string }) {
  return db.question.findMany({ where, include: recordInclude, orderBy: { createdAt: "asc" } });
}

function toRecord(row: RecordRow): QuestionRecord {
  return {
    id: row.id,
    body: row.body,
    isAnonymous: row.isAnonymous,
    authorId: row.authorId,
    authorName: row.author.displayName,
    status: row.status,
    isPinned: row.isPinned,
    isHidden: row.isHidden,
    createdAt: row.createdAt,
    answeredAt: row.answeredAt,
    voterIds: row.votes.map((v) => v.guestId),
    mergedCount: row._count.merged,
  };
}

/** All questions of a session as `QuestionRecord`s (the input of every domain function). */
export async function loadQuestionRecords(sessionId: string): Promise<QuestionRecord[]> {
  return (await loadRecords({ sessionId })).map(toRecord);
}

export async function listQuestions(session: SessionRow, viewer: QuestionViewer): Promise<(QuestionView | StaffQuestionView)[]> {
  const records = await loadQuestionRecords(session.id);
  const views = records.map((r) => toQuestionView(r, viewer)).filter((v): v is QuestionView => v !== null);
  return rankQuestions(views);
}

export async function askQuestion(
  session: SessionRow,
  guestId: string,
  input: AskQuestion,
  now: Date,
): Promise<QuestionView> {
  if (session.status === "ENDED") throw new ApiError("CONFLICT", "This session has ended.");

  const created = await db.$transaction(async (tx) => {
    // Lock this guest's row so their asks run one at a time; otherwise a burst of requests all count the same
    // rows before any of them inserts, and every one gets through (#44). Other guests are not blocked.
    await tx.$queryRaw`SELECT id FROM "Guest" WHERE id = ${guestId} FOR UPDATE`;
    const recent = await tx.question.count({
      where: { authorId: guestId, createdAt: { gt: new Date(now.getTime() - RATE_WINDOW_MS) } },
    });
    if (recent >= MAX_QUESTIONS_PER_MINUTE) throw new ApiError("RATE_LIMITED", "Slow down — try again in a minute.");
    if (input.displayName) await tx.guest.update({ where: { id: guestId }, data: { displayName: input.displayName } });
    const question = await tx.question.create({
      data: { sessionId: session.id, authorId: guestId, body: input.body, isAnonymous: input.isAnonymous, createdAt: now },
      select: { id: true },
    });
    await bumpSessionVersion(tx, session.id);
    return question;
  });
  const [row] = await loadRecords({ id: created.id });
  const view = row ? toQuestionView(toRecord(row), { role: "GUEST", guestId }) : null;
  if (!view) throw new ApiError("INTERNAL", "Question was not saved.");
  return view;
}
