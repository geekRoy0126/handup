type EmptyStateProps = { title: string; body?: string };

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-line px-5 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 text-sm text-ink-muted">{body}</p>}
    </div>
  );
}
