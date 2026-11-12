import "server-only";

import { buildReport, type Report } from "@/lib/domain/report";
import { db } from "@/lib/server/db";

import type { SessionRow } from "./access";
import { listPolls } from "./poll-service";
import { loadQuestionRecords } from "./question-service";

/** Report for staff and for the public API (same visibility rules, PRD §4.5–4.6). */
export async function getSessionReport(session: SessionRow): Promise<Report> {
  const [details, guestCount, questions, polls] = await Promise.all([
    db.session.findUniqueOrThrow({
      where: { id: session.id },
      select: { title: true, code: true, status: true, createdAt: true, endedAt: true },
    }),
    db.guest.count({ where: { sessionId: session.id } }),
    loadQuestionRecords(session.id),
    listPolls(session, { role: "STAFF" }),
  ]);
  return buildReport({
    session: details,
    guestCount,
    questions,
    polls: polls.flatMap((p) => (p.results ? [{ prompt: p.prompt, status: p.status, results: p.results }] : [])),
  });
}
