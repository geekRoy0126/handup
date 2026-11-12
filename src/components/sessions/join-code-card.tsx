"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatJoinCode } from "@/lib/domain/join-code";

type JoinCodeCardProps = { code: string };

export function JoinCodeCard({ code }: JoinCodeCardProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const joinPath = `/join/${code}`;

  async function copyLink() {
    // Only claim success when the write worked: the API is missing on non-HTTPS pages and can be refused (#45).
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(`${window.location.origin}${joinPath}`);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section aria-labelledby="join-code-heading" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="join-code-heading" className="text-sm font-semibold text-ink-muted">
        Join code
      </h2>
      <p className="mt-1 font-mono text-5xl font-bold tracking-widest text-brand-600">{formatJoinCode(code)}</p>
      <p className="mt-2 text-sm text-ink-muted">
        Audience goes to the HandUp home page and types the code, or opens <span className="font-mono">{joinPath}</span>
      </p>
      <Button variant="secondary" className="mt-3" onClick={copyLink}>
        {copyState === "copied" ? "Link copied" : "Copy join link"}
      </Button>
      {copyState === "failed" && (
        <p role="alert" className="mt-2 text-sm text-danger">
          Couldn&apos;t copy. Select the link and copy it by hand:{" "}
          <span className="font-mono text-ink select-all">
            {typeof window === "undefined" ? joinPath : `${window.location.origin}${joinPath}`}
          </span>
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {copyState === "copied" ? "Join link copied" : ""}
      </span>
    </section>
  );
}
