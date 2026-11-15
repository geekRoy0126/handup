"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { AppHeader } from "@/components/ui/app-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/client/api-fetch";
import { useCurrentUser } from "@/lib/client/use-current-user";

type ApiKey = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const formatDate = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : "Never");

export function ApiKeysView() {
  const user = useCurrentUser();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await apiFetch<{ apiKeys: ApiKey[] }>("/api/v1/api-keys");
    if (result.ok) setKeys(result.data.apiKeys);
    else setError(result.message);
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<{ apiKeys: ApiKey[] }>("/api/v1/api-keys").then((result) => {
      if (!active) return;
      if (result.ok) setKeys(result.data.apiKeys);
      else setError(result.message);
    });
    return () => {
      active = false;
    };
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const result = await apiFetch<{ key: string }>("/api/v1/api-keys", { body: { name } });
    if (!result.ok) return setError(result.message);
    setNewKey(result.data.key);
    setName("");
    await load();
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this key? Apps using it will stop working.")) return;
    const result = await apiFetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
    if (result.ok) await load();
    else setError(result.message);
  }

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-bold">API keys</h1>
        <p className="text-ink-muted">
          Keys let a course website or Discord bot read summaries and poll results of sessions you host. See the{" "}
          <Link href="/api-docs" className="font-medium text-brand-600 underline">
            API documentation
          </Link>
          .
        </p>
        <form onSubmit={create} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-end">
          <TextField label="Key name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required className="flex-1" />
          <Button type="submit">Create key</Button>
        </form>
        <FormError message={error} />
        {newKey && (
          <div role="status" className="flex flex-col gap-2 rounded-xl border-2 border-status-answered bg-surface p-5">
            <label htmlFor="new-key" className="text-sm font-semibold">
              Your new API key
            </label>
            <input id="new-key" readOnly value={newKey} className="min-h-11 rounded-lg border border-line bg-surface-muted px-3 font-mono text-sm" />
            <p className="text-sm text-ink-muted">Copy it now — it will not be shown again.</p>
            <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(newKey).catch(() => {})}>
              Copy key
            </Button>
          </div>
        )}
        {keys === null && <Skeleton label="Loading keys" className="h-32" />}
        {keys?.length === 0 && <EmptyState title="No API keys yet" body="Create one above to use the public API." />}
        {keys && keys.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Last used</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className="px-4 py-3">{k.name}</td>
                    <td className="px-4 py-3 font-mono">{k.prefix}…</td>
                    <td className="px-4 py-3">{formatDate(k.createdAt)}</td>
                    <td className="px-4 py-3">{formatDate(k.lastUsedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {k.revokedAt ? (
                        <span className="text-status-hidden">Revoked</span>
                      ) : (
                        <Button variant="ghost" onClick={() => revoke(k.id)} aria-label={`Revoke ${k.name}`}>
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
