"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { apiFetch } from "@/lib/client/api-fetch";
import { formatJoinCode } from "@/lib/domain/join-code";

import { StatusTag } from "./status-tag";

type MySession = {
  code: string;
  title: string;
  status: "LIVE" | "ENDED";
  createdAt: string;
  role: "HOST" | "MODERATOR";
};

type LoadState = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; sessions: MySession[] };

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function SessionList() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ sessions: MySession[] }>("/api/v1/sessions", { signal: controller.signal })
      .then((result) =>
        setState(result.ok ? { kind: "ready", sessions: result.data.sessions } : { kind: "error", message: result.message }),
      )
      .catch(() => {});
    return () => controller.abort();
  }, [attempt]);

  if (state.kind === "loading") {
    return <div aria-label="Loading sessions" className="h-40 animate-pulse rounded-xl bg-surface-muted" />;
  }
  if (state.kind === "error") return <ErrorState message={state.message} onRetry={() => setAttempt((n) => n + 1)} />;
  if (state.sessions.length === 0) {
    return <EmptyState title="No sessions yet" body="Create your first session above and share its join code." />;
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {state.sessions.map((s) => (
        <li key={s.code}>
          <Link href={`/host/${s.code}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-surface-muted">
            <span className="flex-1 font-semibold">{s.title}</span>
            <span className="font-mono text-sm text-ink-muted">{formatJoinCode(s.code)}</span>
            <span className="text-sm text-ink-muted">{s.role === "HOST" ? "Host" : "Moderator"}</span>
            <span className="text-sm text-ink-muted">{dateFormat.format(new Date(s.createdAt))}</span>
            <StatusTag status={s.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
