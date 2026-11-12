import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "./auth-form";

type AuthPageProps = { mode: "login" | "register" };

export function AuthPage({ mode }: AuthPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Link href="/" className="text-lg font-bold text-brand-600">
        HandUp
      </Link>
      <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold">{mode === "login" ? "Log in" : "Create your host account"}</h1>
        <p className="mb-6 text-sm text-ink-muted">
          {mode === "login" ? "Hosts and moderators sign in here." : "Run live Q&A and polls for your audience."}
        </p>
        {/* useSearchParams needs a Suspense boundary under Cache Components. */}
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-surface-muted" />}>
          <AuthForm mode={mode} />
        </Suspense>
      </div>
    </main>
  );
}
