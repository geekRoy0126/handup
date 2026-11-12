"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "./api-fetch";

export type SessionInfo = {
  code: string;
  title: string;
  status: "LIVE" | "ENDED";
  createdAt: string;
  endedAt: string | null;
};
export type ViewerRole = "HOST" | "MODERATOR" | "GUEST" | null;

export type SessionInfoState =
  | { kind: "loading" }
  | { kind: "error"; status: number; message: string }
  | { kind: "ready"; session: SessionInfo; role: ViewerRole };

/** Loads GET /api/v1/sessions/{code}; `reload` re-fetches (e.g. after a real-time event). */
export function useSessionInfo(code: string): { state: SessionInfoState; reload: () => void } {
  const [state, setState] = useState<SessionInfoState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ session: SessionInfo; viewer: { role: ViewerRole } }>(`/api/v1/sessions/${code}`, {
      signal: controller.signal,
    })
      .then((result) =>
        setState(
          result.ok
            ? { kind: "ready", session: result.data.session, role: result.data.viewer.role }
            : { kind: "error", status: result.status, message: result.message },
        ),
      )
      .catch(() => {});
    return () => controller.abort();
  }, [code, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, reload };
}
