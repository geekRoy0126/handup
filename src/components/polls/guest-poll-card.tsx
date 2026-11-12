"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api-fetch";
import type { PollItem } from "@/lib/client/use-polls";

import { PollResults } from "./poll-results";

type GuestPollCardProps = { poll: PollItem; onAnswered: () => void };

export function GuestPollCard({ poll, onAnswered }: GuestPollCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const isOpen = poll.status === "OPEN";
  const showOptions = isOpen && (poll.myOptionId === null || isChanging);

  async function answer(optionId: string) {
    setError(null);
    const result = await apiFetch(`/api/v1/polls/${poll.id}/responses`, { body: { optionId } });
    if (!result.ok) return setError(result.message);
    setIsChanging(false);
    onAnswered();
  }

  return (
    <section aria-label="Live poll" className="flex flex-col gap-3 rounded-xl border-2 border-brand-600 bg-surface p-4">
      <p className="text-xs font-semibold text-brand-600">{isOpen ? "● Live poll" : "Poll closed"}</p>
      <p className="text-lg font-semibold">{poll.prompt}</p>
      {showOptions && (
        <div className="flex flex-col gap-2">
          {poll.options.map((o) => (
            <Button key={o.id} variant={o.id === poll.myOptionId ? "primary" : "secondary"} onClick={() => answer(o.id)}>
              {o.label}
            </Button>
          ))}
        </div>
      )}
      {!showOptions && poll.results && <PollResults results={poll.results} highlightOptionId={poll.myOptionId} />}
      {!showOptions && isOpen && (
        <Button variant="ghost" onClick={() => setIsChanging(true)}>
          Change my answer
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
