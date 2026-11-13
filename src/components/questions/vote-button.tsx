"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/client/api-fetch";
import type { QuestionItem } from "@/lib/client/use-questions";

type VoteButtonProps = { question: QuestionItem; disabled?: boolean; onVoted: () => void };

export function voteLabel(votes: number): string {
  return `${votes} ${votes === 1 ? "vote" : "votes"}`;
}

export function VoteButton({ question, disabled = false, onVoted }: VoteButtonProps) {
  const [optimistic, setOptimistic] = useState<{ voted: boolean; votes: number } | null>(null);
  const voted = optimistic?.voted ?? question.hasVoted;
  const votes = optimistic?.votes ?? question.votes;
  const isOwn = question.isMine;

  async function toggle() {
    setOptimistic({ voted: !voted, votes: votes + (voted ? -1 : 1) });
    const result = await apiFetch<{ voted: boolean; votes: number }>(`/api/v1/questions/${question.id}/vote`, {
      method: "POST",
    });
    setOptimistic(null);
    if (result.ok) onVoted();
  }

  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={isOwn || disabled}
        aria-pressed={voted}
        aria-label={isOwn ? `Your question, ${voteLabel(votes)}` : `Upvote, ${voteLabel(votes)}`}
        className={`flex size-12 items-center justify-center rounded-lg border text-xl font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed ${
          voted ? "border-brand-600 bg-brand-600 text-on-brand" : "border-line bg-surface text-ink hover:bg-surface-muted"
        } ${isOwn ? "opacity-60" : ""}`}
      >
        <span aria-hidden="true">▲</span>
      </button>
      <span aria-live="polite" className="text-sm font-semibold tabular-nums">
        {votes}
      </span>
    </div>
  );
}

/** Read-only count shown to staff, who can't vote. */
export function VoteCount({ votes }: { votes: number }) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-surface-muted py-2">
      <span aria-live="polite" className="text-lg font-bold tabular-nums">
        {votes}
      </span>{" "}
      <span className="text-xs text-ink-muted">{votes === 1 ? "vote" : "votes"}</span>
    </div>
  );
}
