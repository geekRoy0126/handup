"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `onChange` whenever the session changes (PRD §4.7). EventSource reconnects by itself when the server
 * closes the stream; after a reconnect, a different `ready` version also counts as a change.
 */
export function useSessionEvents(code: string, enabled: boolean, onChange: () => void): void {
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    const source = new EventSource(`/api/v1/sessions/${code}/events`);
    let lastVersion: number | null = null;

    const handle = (event: MessageEvent<string>) => {
      const { version } = JSON.parse(event.data) as { version: number };
      if (lastVersion !== null && version !== lastVersion) callback.current();
      lastVersion = version;
    };
    source.addEventListener("ready", handle);
    source.addEventListener("changed", (event) => {
      lastVersion = (JSON.parse((event as MessageEvent<string>).data) as { version: number }).version;
      callback.current();
    });
    return () => source.close();
  }, [code, enabled]);
}
