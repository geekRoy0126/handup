"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatJoinCode } from "@/lib/domain/join-code";

type JoinCodeCardProps = { code: string };

export function JoinCodeCard({ code }: JoinCodeCardProps) {
  const [copied, setCopied] = useState(false);
  const joinPath = `/join/${code}`;

  async function copyLink() {
    await navigator.clipboard?.writeText(`${window.location.origin}${joinPath}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        {copied ? "Link copied" : "Copy join link"}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Join link copied" : ""}
      </span>
    </section>
  );
}
