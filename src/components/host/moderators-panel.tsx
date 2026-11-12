"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { apiFetch } from "@/lib/client/api-fetch";

type Moderator = { userId: string; name: string; email: string };

export function ModeratorsPanel({ code }: { code: string }) {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    const result = await apiFetch<{ moderators: Moderator[] }>(`/api/v1/sessions/${code}/moderators`);
    if (result.ok) setModerators(result.data.moderators);
  }, [code]);

  useEffect(() => {
    let active = true;
    apiFetch<{ moderators: Moderator[] }>(`/api/v1/sessions/${code}/moderators`).then((result) => {
      if (active && result.ok) setModerators(result.data.moderators);
    });
    return () => {
      active = false;
    };
  }, [code]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const result = await apiFetch(`/api/v1/sessions/${code}/moderators`, { body: { email } });
    if (!result.ok) return setError(result.message);
    setEmail("");
    await load();
  }

  async function remove(userId: string) {
    const result = await apiFetch(`/api/v1/sessions/${code}/moderators/${userId}`, { method: "DELETE" });
    if (result.ok) await load();
    else setError(result.message);
  }

  return (
    <section aria-labelledby="moderators-heading" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <h2 id="moderators-heading" className="text-sm font-semibold text-ink-muted">
        Moderators
      </h2>
      <p className="text-sm text-ink-muted">Moderators can pin, answer, hide and merge questions. They need a HandUp account.</p>
      {moderators.length > 0 && (
        <ul aria-label="Moderators" className="flex flex-col gap-2">
          {moderators.map((m) => (
            <li key={m.userId} className="flex items-center gap-2 text-sm">
              <span className="flex-1">
                <span className="font-medium">{m.name}</span> <span className="text-ink-muted">{m.email}</span>
              </span>
              <Button variant="ghost" onClick={() => remove(m.userId)} aria-label={`Remove ${m.name}`}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleInvite} className="flex flex-col gap-2">
        <TextField label="Moderator email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <FormError message={error} />
        <Button type="submit" variant="secondary">
          Add moderator
        </Button>
      </form>
    </section>
  );
}
