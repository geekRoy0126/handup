"use client";

import { CreateSessionForm } from "@/components/sessions/create-session-form";
import { SessionList } from "@/components/sessions/session-list";
import { AppHeader } from "@/components/ui/app-header";
import { useCurrentUser } from "@/lib/client/use-current-user";

export function DashboardView() {
  const user = useCurrentUser();

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-bold">Your sessions</h1>
        <CreateSessionForm />
        <SessionList />
      </main>
    </>
  );
}
