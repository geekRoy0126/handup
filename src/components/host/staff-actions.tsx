"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api-fetch";
import type { QuestionItem } from "@/lib/client/use-questions";

type StaffActionsProps = { question: QuestionItem; onDone: () => void; onError: (message: string) => void };

type Action = { action: string; label: string };

function actionsFor(q: QuestionItem): Action[] {
  const list: Action[] = [];
  if (q.status === "OPEN" && !q.isHidden) list.push(q.isPinned ? { action: "unpin", label: "Unpin" } : { action: "pin", label: "Pin" });
  list.push(q.status === "OPEN" ? { action: "answer", label: "Mark answered" } : { action: "reopen", label: "Reopen" });
  list.push(q.isHidden ? { action: "unhide", label: "Unhide" } : { action: "hide", label: "Hide" });
  return list;
}

export function StaffActions({ question, onDone, onError }: StaffActionsProps) {
  const [busy, setBusy] = useState(false);

  async function run(action: string) {
    setBusy(true);
    const result = await apiFetch(`/api/v1/questions/${question.id}`, { method: "PATCH", body: { action } });
    setBusy(false);
    if (result.ok) onDone();
    else onError(result.message);
  }

  return (
    <>
      {actionsFor(question).map(({ action, label }) => (
        <Button key={action} variant="secondary" disabled={busy} onClick={() => run(action)}>
          {label}
        </Button>
      ))}
    </>
  );
}
