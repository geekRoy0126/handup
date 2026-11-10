"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api-fetch";
import type { QuestionItem } from "@/lib/client/use-questions";

type StaffActionsProps = {
  question: QuestionItem;
  /** Other questions this one can be merged into. */
  mergeTargets: QuestionItem[];
  onDone: () => void;
  onError: (message: string) => void;
};

type Action = { action: string; label: string };

function actionsFor(q: QuestionItem): Action[] {
  const list: Action[] = [];
  if (q.status === "OPEN" && !q.isHidden) list.push(q.isPinned ? { action: "unpin", label: "Unpin" } : { action: "pin", label: "Pin" });
  list.push(q.status === "OPEN" ? { action: "answer", label: "Mark answered" } : { action: "reopen", label: "Reopen" });
  list.push(q.isHidden ? { action: "unhide", label: "Unhide" } : { action: "hide", label: "Hide" });
  return list;
}

function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function StaffActions({ question, mergeTargets, onDone, onError }: StaffActionsProps) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [targetId, setTargetId] = useState("");

  async function call(path: string, method: string, body: unknown) {
    setBusy(true);
    const result = await apiFetch(path, { method, body });
    setBusy(false);
    if (result.ok) onDone();
    else onError(result.message);
  }

  return (
    <>
      {actionsFor(question).map(({ action, label }) => (
        <Button
          key={action}
          variant="secondary"
          disabled={busy}
          onClick={() => call(`/api/v1/questions/${question.id}`, "PATCH", { action })}
        >
          {label}
        </Button>
      ))}
      {mergeTargets.length > 0 && (
        <span className="flex items-center gap-2">
          <label htmlFor={`${id}-merge`} className="sr-only">
            Merge into
          </label>
          <select
            id={`${id}-merge`}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="min-h-11 max-w-56 rounded-lg border border-line bg-surface px-2 text-sm"
          >
            <option value="">Merge into…</option>
            {mergeTargets.map((t) => (
              <option key={t.id} value={t.id} label={t.body}>
                {truncate(t.body)}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            disabled={busy || !targetId}
            onClick={() => call(`/api/v1/questions/${question.id}/merge`, "POST", { targetId })}
          >
            Merge
          </Button>
        </span>
      )}
    </>
  );
}
