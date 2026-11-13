// Session report (docs/PRD.md §4.5). Pure: the service loads the data, these functions shape and render it.
import { formatJoinCode } from "./join-code";
import type { PollResults } from "./poll-results";
import type { QuestionRecord } from "./question-view";

export const TOP_QUESTIONS_LIMIT = 10;

export type ReportInput = {
  session: { title: string; code: string; status: "LIVE" | "ENDED"; createdAt: Date; endedAt: Date | null };
  guestCount: number;
  questions: QuestionRecord[];
  polls: { prompt: string; status: "OPEN" | "CLOSED"; results: PollResults }[];
};

export type ReportQuestion = { body: string; votes: number; status: "OPEN" | "ANSWERED"; authorName: string | null };

export type Report = {
  session: ReportInput["session"];
  totals: { guests: number; questions: number; votes: number };
  topQuestions: ReportQuestion[];
  unanswered: ReportQuestion[];
  polls: ReportInput["polls"];
};

function byVotesThenOlder(a: QuestionRecord, b: QuestionRecord): number {
  return b.voterIds.length - a.voterIds.length || a.createdAt.getTime() - b.createdAt.getTime();
}

function toReportQuestion(q: QuestionRecord): ReportQuestion {
  return {
    body: q.body,
    votes: q.voterIds.length,
    status: q.status === "ANSWERED" ? "ANSWERED" : "OPEN",
    authorName: q.isAnonymous ? null : q.authorName,
  };
}

export function buildReport(input: ReportInput): Report {
  const visible = input.questions.filter((q) => q.status !== "MERGED" && !q.isHidden).sort(byVotesThenOlder);
  return {
    session: input.session,
    totals: {
      guests: input.guestCount,
      questions: input.questions.length,
      votes: input.questions.reduce((sum, q) => sum + q.voterIds.length, 0),
    },
    topQuestions: visible.slice(0, TOP_QUESTIONS_LIMIT).map(toReportQuestion),
    unanswered: visible.filter((q) => q.status === "OPEN").map(toReportQuestion),
    polls: input.polls,
  };
}

function formatUtc(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

// Guest text is untrusted: escape every character Markdown (and GitHub's raw HTML) gives meaning to, so a question
// can't turn into a link, heading, emphasis or an HTML tag when the host opens the file (#61).
const MARKDOWN_SPECIAL = /[\\`*_{}[\]()#+\-!<>|~]/g;

export function escapeMarkdown(text: string): string {
  return text.replace(MARKDOWN_SPECIAL, (ch) => `\\${ch}`);
}

function questionLines(list: ReportQuestion[]): string[] {
  if (list.length === 0) return ["_No questions._"];
  return list.map((q, i) => {
    const body = escapeMarkdown(q.body.replace(/\s+/g, " ").trim());
    const name = q.authorName ? escapeMarkdown(q.authorName) : "";
    const extras = [q.status === "ANSWERED" ? "answered" : "", name ? `by ${name}` : ""].filter(Boolean);
    return `${i + 1}. ${body} — ${q.votes} ${q.votes === 1 ? "vote" : "votes"}${extras.length ? ` (${extras.join(", ")})` : ""}`;
  });
}

export function renderReportMarkdown(report: Report): string {
  const { session, totals } = report;
  const when = `Started ${formatUtc(session.createdAt)} · ${session.endedAt ? `Ended ${formatUtc(session.endedAt)}` : "Still live"}`;
  const polls =
    report.polls.length === 0
      ? ["_No polls._"]
      : report.polls.flatMap((p) => [
          `### ${p.prompt}`,
          "",
          ...p.results.options.map((o) => `- ${o.label}: ${o.count} (${o.percent}%)`),
          `- _${p.results.total} responses${p.status === "OPEN" ? ", still open" : ""}_`,
          "",
        ]);
  return [
    `# ${session.title} — session report`,
    "",
    `Join code: ${formatJoinCode(session.code)} · ${when}`,
    "",
    `${totals.guests} guests · ${totals.questions} questions · ${totals.votes} votes`,
    "",
    "## Top questions",
    "",
    ...questionLines(report.topQuestions),
    "",
    "## Unanswered questions",
    "",
    ...questionLines(report.unanswered),
    "",
    "## Polls",
    "",
    ...polls,
  ].join("\n");
}
