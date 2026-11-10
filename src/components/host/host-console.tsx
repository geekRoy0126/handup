"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { ModeratorsPanel } from "@/components/host/moderators-panel";
import { StaffActions } from "@/components/host/staff-actions";
import { JoinCodeCard } from "@/components/sessions/join-code-card";
import { StatusTag } from "@/components/sessions/status-tag";
import { AppHeader } from "@/components/ui/app-header";
import { Button } from "@/components/ui/button";
import { QuestionList } from "@/components/questions/question-list";
import { VoteCount } from "@/components/questions/vote-button";
import { ErrorState } from "@/components/ui/error-state";
import { apiFetch } from "@/lib/client/api-fetch";
import { useCurrentUser } from "@/lib/client/use-current-user";
import { useQuestions } from "@/lib/client/use-questions";
import { useSessionEvents } from "@/lib/client/use-session-events";
import { useSessionInfo } from "@/lib/client/use-session-info";

export function HostConsole() {
  const { code } = useParams<{ code: string }>();
  const user = useCurrentUser();
  const { state, reload } = useSessionInfo(code);
  const isStaff = state.kind === "ready" && (state.role === "HOST" || state.role === "MODERATOR");
  const { state: board, reload: reloadBoard } = useQuestions(code, isStaff);
  useSessionEvents(code, isStaff, reloadBoard);
  const [actionError, setActionError] = useState<string | null>(null);

  async function endSession() {
    if (!window.confirm("End this session? The audience will no longer be able to ask or vote.")) return;
    const result = await apiFetch(`/api/v1/sessions/${code}/end`, { method: "POST" });
    if (result.ok) reload();
    else setActionError(result.message);
  }

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
        {state.kind === "loading" && <div aria-label="Loading session" className="h-48 animate-pulse rounded-xl bg-surface-muted" />}
        {state.kind === "error" && <ErrorState message={state.message} onRetry={reload} />}
        {state.kind === "ready" && state.role !== "HOST" && state.role !== "MODERATOR" && (
          <ErrorState message="Only the host and moderators of this session can open its console." />
        )}
        {state.kind === "ready" && (state.role === "HOST" || state.role === "MODERATOR") && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="flex-1 text-3xl font-bold">{state.session.title}</h1>
              <StatusTag status={state.session.status} />
              {state.role === "HOST" && state.session.status === "LIVE" && (
                <Button variant="danger" onClick={endSession}>
                  End session
                </Button>
              )}
            </div>
            {actionError && <ErrorState message={actionError} />}
            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
              <section aria-label="Questions" className="flex flex-col gap-4">
                {board.kind === "loading" && <div aria-label="Loading questions" className="h-32 animate-pulse rounded-xl bg-surface-muted" />}
                {board.kind === "error" && <ErrorState message={board.message} onRetry={reloadBoard} />}
                {board.kind === "ready" && (
                  <QuestionList
                    questions={board.questions}
                    emptyBody="Share the join code. Questions appear here live."
                    renderVote={(q) => <VoteCount votes={q.votes} />}
                    renderActions={(q) => (
                      <StaffActions
                        question={q}
                        mergeTargets={board.questions.filter((t) => t.id !== q.id && t.status === "OPEN")}
                        onDone={reloadBoard}
                        onError={setActionError}
                      />
                    )}
                  />
                )}
              </section>
              <aside className="flex flex-col gap-4">
                <JoinCodeCard code={state.session.code} />
                {state.role === "HOST" ? (
                  <ModeratorsPanel code={state.session.code} />
                ) : (
                  <p className="rounded-xl border border-line bg-surface-muted p-4 text-sm">You are moderating this session.</p>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </>
  );
}
