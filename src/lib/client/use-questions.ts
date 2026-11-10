"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "./api-fetch";

export type QuestionItem = {
  id: string;
  body: string;
  authorName: string | null;
  status: "OPEN" | "ANSWERED";
  isPinned: boolean;
  createdAt: string;
  answeredAt: string | null;
  votes: number;
  hasVoted: boolean;
  isMine: boolean;
  mergedCount: number;
  isHidden?: boolean;
};

export type QuestionsState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; questions: QuestionItem[] };

/** Loads the board for the current viewer. `enabled` lets a guest page wait until it has joined. */
export function useQuestions(code: string, enabled = true) {
  const [state, setState] = useState<QuestionsState>({ kind: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    apiFetch<{ questions: QuestionItem[] }>(`/api/v1/sessions/${code}/questions`, { signal: controller.signal })
      .then((result) => {
        // Keep showing the last good board if a background refresh fails.
        if (result.ok) setState({ kind: "ready", questions: result.data.questions });
        else setState((prev) => (prev.kind === "ready" ? prev : { kind: "error", message: result.message }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [code, enabled, version]);

  const reload = useCallback(() => setVersion((n) => n + 1), []);
  return { state, reload };
}
