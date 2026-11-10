import { describe, expect, it } from "vitest";

import type { QuestionRecord } from "./question-view";
import { buildReport, renderReportMarkdown, type ReportInput } from "./report";

const T0 = new Date("2026-11-12T15:00:00Z");

function q(id: string, overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  return {
    id,
    body: `Question ${id}`,
    isAnonymous: true,
    authorId: "g1",
    authorName: "Sam",
    status: "OPEN",
    isPinned: false,
    isHidden: false,
    createdAt: T0,
    answeredAt: null,
    voterIds: [],
    mergedCount: 0,
    ...overrides,
  };
}

const votes = (n: number) => Array.from({ length: n }, (_, i) => `v${i}`);

function input(questions: QuestionRecord[], extra: Partial<ReportInput> = {}): ReportInput {
  return {
    session: { title: "CS6983 Lecture 9", code: "K7Q2XM", status: "ENDED", createdAt: T0, endedAt: T0 },
    guestCount: 12,
    questions,
    polls: [],
    ...extra,
  };
}

describe("buildReport (PRD §4.5)", () => {
  it("counts guests, questions asked and votes", () => {
    const r = buildReport(input([q("a", { voterIds: votes(3) }), q("b", { voterIds: votes(2) })]));
    expect(r.totals).toEqual({ guests: 12, questions: 2, votes: 5 });
  });

  it("lists at most 10 top questions by votes, answered ones included", () => {
    const questions = Array.from({ length: 12 }, (_, i) => q(`q${i}`, { voterIds: votes(i) }));
    questions[11] = { ...questions[11]!, status: "ANSWERED", answeredAt: T0 };
    const r = buildReport(input(questions));
    expect(r.topQuestions).toHaveLength(10);
    expect(r.topQuestions[0]).toMatchObject({ body: "Question q11", votes: 11, status: "ANSWERED" });
  });

  it("leaves hidden and merged questions out of the lists", () => {
    const r = buildReport(input([q("shown"), q("hidden", { isHidden: true }), q("merged", { status: "MERGED" })]));
    expect(r.topQuestions.map((x) => x.body)).toEqual(["Question shown"]);
    expect(r.unanswered.map((x) => x.body)).toEqual(["Question shown"]);
  });

  it("lists unanswered questions (open, not hidden) by votes", () => {
    const r = buildReport(
      input([q("low", { voterIds: votes(1) }), q("done", { status: "ANSWERED" }), q("high", { voterIds: votes(4) })]),
    );
    expect(r.unanswered.map((x) => x.body)).toEqual(["Question high", "Question low"]);
  });

  it("never includes the name of an anonymous asker", () => {
    const r = buildReport(input([q("a", { isAnonymous: true }), q("b", { isAnonymous: false, authorName: "Lee" })]));
    expect(JSON.stringify(r)).not.toContain("Sam");
    expect(r.topQuestions.find((x) => x.body === "Question b")?.authorName).toBe("Lee");
  });
});

describe("renderReportMarkdown", () => {
  const report = buildReport(
    input([q("a", { body: "Line one\nline two", voterIds: votes(2) })], {
      polls: [
        {
          prompt: "Which topic next?",
          status: "CLOSED",
          results: { total: 2, options: [{ optionId: "o1", label: "RAG", count: 2, percent: 100 }] },
        },
      ],
    }),
  );
  const md = renderReportMarkdown(report);

  it("has a title, totals and every section", () => {
    expect(md).toContain("# CS6983 Lecture 9 — session report");
    expect(md).toContain("Join code: K7Q-2XM");
    expect(md).toContain("12 guests · 1 questions · 2 votes");
    for (const heading of ["## Top questions", "## Unanswered questions", "## Polls"]) expect(md).toContain(heading);
  });

  it("puts each question on one line with its votes", () => {
    expect(md).toContain("1. Line one line two — 2 votes");
  });

  it("shows poll results", () => {
    expect(md).toContain("### Which topic next?");
    expect(md).toContain("- RAG: 2 (100%)");
  });

  it("says so when there is nothing to list", () => {
    const empty = renderReportMarkdown(buildReport(input([])));
    expect(empty).toContain("_No questions._");
    expect(empty).toContain("_No polls._");
  });
});
