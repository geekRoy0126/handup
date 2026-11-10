import Link from "next/link";

import { JoinForm } from "@/components/home/join-form";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">HandUp</h1>
      <p className="text-lg text-ink-muted">
        Ask questions and answer polls during a talk, anonymously if you like. The questions most people care
        about rise to the top.
      </p>
      <JoinForm />
      <p className="text-sm text-ink-muted">
        Running a talk?{" "}
        <Link href="/login" className="font-medium text-brand-600 underline">
          Host a session
        </Link>
      </p>
    </main>
  );
}
