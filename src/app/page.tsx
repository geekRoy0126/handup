export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">HandUp</h1>
      <p className="text-lg text-ink-muted">
        Ask questions and answer polls during a talk, anonymously if you like. The questions most people care
        about rise to the top.
      </p>
      {/* TODO(#5): join-with-code form. TODO(#3): host sign-in link. */}
    </main>
  );
}
