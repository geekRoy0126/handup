"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "./api-fetch";

export type PollResultsData = { total: number; options: { optionId: string; label: string; count: number; percent: number }[] };
export type PollItem = {
  id: string;
  kind: "MULTIPLE_CHOICE" | "CONFIDENCE";
  prompt: string;
  status: "OPEN" | "CLOSED";
  options: { id: string; label: string }[];
  myOptionId: string | null;
  results: PollResultsData | null;
};

/** Polls of a session, newest first. */
export function usePolls(code: string, enabled: boolean) {
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    apiFetch<{ polls: PollItem[] }>(`/api/v1/sessions/${code}/polls`, { signal: controller.signal })
      .then((result) => {
        if (result.ok) setPolls(result.data.polls);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [code, enabled, version]);

  const reload = useCallback(() => setVersion((n) => n + 1), []);
  return { polls, reload };
}
