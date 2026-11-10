"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AskForm } from "@/components/questions/ask-form";
import { QuestionList } from "@/components/questions/question-list";
import { VoteButton } from "@/components/questions/vote-button";
import { ErrorState } from "@/components/ui/error-state";
import { apiFetch } from "@/lib/client/api-fetch";
import { useQuestions } from "@/lib/client/use-questions";
import { useSessionEvents } from "@/lib/client/use-session-events";
import { useSessionInfo } from "@/lib/client/use-session-info";

type JoinState = { kind: "joining" } | { kind: "joined" } | { kind: "error"; message: string };

export function GuestBoard() {
  const { code } = useParams<{ code: string }>();
  const [join, setJoin] = useState<JoinState>({ kind: "joining" });
  const { state: info, reload: reloadInfo } = useSessionInfo(code);
  const { state, reload } = useQuestions(code, join.kind === "joined");
  const isEnded = info.kind === "ready" && info.session.status === "ENDED";
  useSessionEvents(code, join.kind === "joined", () => {
    reload();
    reloadInfo();
  });

  useEffect(() => {
    apiFetch(`/api/v1/sessions/${code}/join`, { method: "POST" }).then((result) =>
      setJoin(result.ok ? { kind: "joined" } : { kind: "error", message: result.message }),
    );
  }, [code]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
      <Link href="/" className="text-sm font-bold text-brand-600">
        HandUp
      </Link>
      <h1 className="text-2xl font-bold">{info.kind === "ready" ? info.session.title : "Joining…"}</h1>
      {join.kind === "error" && <ErrorState message={join.message} />}
      {join.kind === "joined" && (
        <>
          {isEnded ? (
            <p role="status" className="rounded-xl border border-line bg-surface-muted p-4 text-sm">
              This session has ended. Thanks for taking part!
            </p>
          ) : (
            <AskForm code={code} onAsked={reload} />
          )}
          {state.kind === "loading" && <div aria-label="Loading questions" className="h-32 animate-pulse rounded-xl bg-surface-muted" />}
          {state.kind === "error" && <ErrorState message={state.message} onRetry={reload} />}
          {state.kind === "ready" && (
            <QuestionList
              questions={state.questions}
              emptyBody="Be the first to ask. You can stay anonymous."
              renderVote={(q) => <VoteButton question={q} disabled={isEnded} onVoted={reload} />}
            />
          )}
        </>
      )}
    </main>
  );
}
