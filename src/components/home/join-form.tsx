"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { apiFetch } from "@/lib/client/api-fetch";
import { normalizeJoinCode } from "@/lib/domain/join-code";
import type { SessionInfo } from "@/lib/client/use-session-info";

export function JoinForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const code = normalizeJoinCode(String(new FormData(event.currentTarget).get("code") ?? ""));
    if (!code) {
      setError("No session with that code.");
      return;
    }
    setIsSubmitting(true);
    const result = await apiFetch<{ session: SessionInfo }>(`/api/v1/sessions/${code}`);
    setIsSubmitting(false);
    if (!result.ok) setError(result.message);
    else if (result.data.session.status === "ENDED") setError("This session has ended.");
    else router.push(`/join/${code}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <TextField
        label="Join code"
        name="code"
        placeholder="K7Q-2XM"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        className="[&_input]:font-mono [&_input]:text-2xl [&_input]:tracking-widest"
      />
      <FormError message={error} />
      <Button type="submit" disabled={isSubmitting}>
        Join
      </Button>
    </form>
  );
}
