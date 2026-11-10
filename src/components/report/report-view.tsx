"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PollResults } from "@/components/polls/poll-results";
import { StatusTag } from "@/components/sessions/status-tag";
import { AppHeader } from "@/components/ui/app-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiFetch } from "@/lib/client/api-fetch";
import { useCurrentUser } from "@/lib/client/use-current-user";
import { renderReportMarkdown, type Report, type ReportQuestion } from "@/lib/domain/report";

/** JSON turns Dates into strings; the Markdown renderer needs real Dates back. */
type ReportJson = Omit<Report, "session"> & {
  session: Omit<Report["session"], "createdAt" | "endedAt"> & { createdAt: string; endedAt: string | null };
};

function reviveReport(json: ReportJson): Report {
  return {
    ...json,
    session: {
      ...json.session,
      createdAt: new Date(json.session.createdAt),
      endedAt: json.session.endedAt ? new Date(json.session.endedAt) : null,
    },
  };
}

function downloadMarkdown(report: Report) {
  const blob = new Blob([renderReportMarkdown(report)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `handup-${report.session.code}-report.md`;
  link.click();
  URL.revokeObjectURL(url);
}

function QuestionTable({ id, title, questions }: { id: string; title: string; questions: ReportQuestion[] }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {questions.length === 0 ? (
        <EmptyState title="No questions" />
      ) : (
        <ol className="divide-y divide-line rounded-xl border border-line bg-surface">
          {questions.map((q, i) => (
            <li key={`${i}-${q.body}`} className="flex gap-4 px-4 py-3">
              <span className="w-16 shrink-0 text-sm font-semibold tabular-nums">
                {q.votes} {q.votes === 1 ? "vote" : "votes"}
              </span>
              <span className="flex-1 break-words">{q.body}</span>
              <span className="text-sm text-ink-muted">
                {q.status === "ANSWERED" ? "✓ Answered" : ""} {q.authorName ?? "Anonymous"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function ReportView() {
  const { code } = useParams<{ code: string }>();
  const user = useCurrentUser();
  const [state, setState] = useState<{ kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; report: Report }>({
    kind: "loading",
  });

  useEffect(() => {
    apiFetch<{ report: ReportJson }>(`/api/v1/sessions/${code}/report`).then((result) =>
      setState(result.ok ? { kind: "ready", report: reviveReport(result.data.report) } : { kind: "error", message: result.message }),
    );
  }, [code]);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8">
        {state.kind === "loading" && <div aria-label="Loading report" className="h-64 animate-pulse rounded-xl bg-surface-muted" />}
        {state.kind === "error" && <ErrorState message={state.message} />}
        {state.kind === "ready" && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="flex-1 text-3xl font-bold">{state.report.session.title} — report</h1>
              <StatusTag status={state.report.session.status} />
              <Button onClick={() => downloadMarkdown(state.report)}>Download as Markdown</Button>
            </div>
            <Link href={`/host/${code}`} className="text-sm font-medium text-brand-600 underline">
              Back to the console
            </Link>
            <dl className="grid grid-cols-3 gap-4">
              {(
                [
                  ["Guests", state.report.totals.guests],
                  ["Questions", state.report.totals.questions],
                  ["Votes", state.report.totals.votes],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line bg-surface p-4">
                  <dt className="text-sm text-ink-muted">{label}</dt>
                  <dd className="text-3xl font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <QuestionTable id="top-heading" title="Top questions" questions={state.report.topQuestions} />
            <QuestionTable id="unanswered-heading" title="Unanswered questions" questions={state.report.unanswered} />
            <section aria-labelledby="polls-heading" className="flex flex-col gap-3">
              <h2 id="polls-heading" className="text-xl font-semibold">
                Polls
              </h2>
              {state.report.polls.length === 0 ? (
                <EmptyState title="No polls" />
              ) : (
                state.report.polls.map((p, i) => (
                  <div key={`${i}-${p.prompt}`} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
                    <p className="font-semibold">{p.prompt}</p>
                    <PollResults results={p.results} />
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
