"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/client/api-fetch";
import type { CurrentUser } from "@/lib/client/use-current-user";

import { Button } from "./button";

type AppHeaderProps = { user: CurrentUser | null };

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter();

  async function logOut() {
    await apiFetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <nav aria-label="Main" className="flex items-center gap-4">
          <Link href="/dashboard" className="text-lg font-bold text-brand-600">
            HandUp
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-ink-muted hover:text-ink">
            Sessions
          </Link>
          <Link href="/settings/api-keys" className="text-sm font-medium text-ink-muted hover:text-ink">
            API keys
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {user && <span className="max-w-32 truncate text-sm text-ink-muted sm:max-w-none">Signed in as {user.name}</span>}
          <Button variant="secondary" onClick={logOut}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
