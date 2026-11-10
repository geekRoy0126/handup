"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { apiFetch } from "@/lib/client/api-fetch";
import type { PollItem } from "@/lib/client/use-polls";
import { POLL_MAX_OPTIONS, POLL_MIN_OPTIONS } from "@/lib/validation/poll";

import { PollResults } from "./poll-results";

type HostPollPanelProps = { code: string; polls: PollItem[]; canLaunch: boolean; onChange: () => void };

export function HostPollPanel({ code, polls, canLaunch, onChange }: HostPollPanelProps) {
  const [kind, setKind] = useState<"MULTIPLE_CHOICE" | "CONFIDENCE">("MULTIPLE_CHOICE");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const openPoll = polls.find((p) => p.status === "OPEN");
  const closedPolls = polls.filter((p) => p.status === "CLOSED");

  async function launch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const body = kind === "CONFIDENCE" ? { kind, prompt } : { kind, prompt, options: options.filter((o) => o.trim()) };
    const result = await apiFetch(`/api/v1/sessions/${code}/polls`, { body });
    if (!result.ok) return setError(result.message);
    setPrompt("");
    setOptions(["", ""]);
    onChange();
  }

  async function close(pollId: string) {
    const result = await apiFetch(`/api/v1/polls/${pollId}/close`, { method: "POST" });
    if (result.ok) onChange();
    else setError(result.message);
  }

  return (
    <section aria-label="Polls" className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink-muted">Polls</h2>
      {openPoll && (
        <div className="flex flex-col gap-3">
          <p className="font-semibold">{openPoll.prompt}</p>
          {openPoll.results && <PollResults results={openPoll.results} />}
          {canLaunch && (
            <Button variant="secondary" onClick={() => close(openPoll.id)}>
              Close poll
            </Button>
          )}
        </div>
      )}
      {!openPoll && canLaunch && (
        <form onSubmit={launch} className="flex flex-col gap-3">
          <fieldset className="flex gap-4 text-sm">
            <legend className="sr-only">Poll type</legend>
            {(["MULTIPLE_CHOICE", "CONFIDENCE"] as const).map((k) => (
              <label key={k} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} className="accent-brand-600" />
                {k === "MULTIPLE_CHOICE" ? "Multiple choice" : "Confidence 1–5"}
              </label>
            ))}
          </fieldset>
          <TextField label="Poll question" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={200} required />
          {kind === "MULTIPLE_CHOICE" && (
            <>
              {options.map((value, i) => (
                <TextField
                  key={i}
                  label={`Option ${i + 1}`}
                  value={value}
                  maxLength={80}
                  onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                />
              ))}
              <div className="flex gap-2">
                {options.length < POLL_MAX_OPTIONS && (
                  <Button variant="ghost" onClick={() => setOptions([...options, ""])}>
                    Add option
                  </Button>
                )}
                {options.length > POLL_MIN_OPTIONS && (
                  <Button variant="ghost" onClick={() => setOptions(options.slice(0, -1))}>
                    Remove last
                  </Button>
                )}
              </div>
            </>
          )}
          <FormError message={error} />
          <Button type="submit">Launch poll</Button>
        </form>
      )}
      {!openPoll && !canLaunch && <p className="text-sm text-ink-muted">No poll running. Only the host can launch polls.</p>}
      {closedPolls.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">Past polls ({closedPolls.length})</summary>
          <ul className="mt-3 flex flex-col gap-4">
            {closedPolls.map((p) => (
              <li key={p.id} className="flex flex-col gap-2">
                <p className="text-sm font-semibold">{p.prompt}</p>
                {p.results && <PollResults results={p.results} />}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
