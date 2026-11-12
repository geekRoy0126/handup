import type { PollResultsData } from "@/lib/client/use-polls";

type PollResultsProps = { results: PollResultsData; highlightOptionId?: string | null };

/** Horizontal bars with label, count and percent. Values are text, so nothing relies on bar length or color. */
export function PollResults({ results, highlightOptionId }: PollResultsProps) {
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {results.options.map((o) => (
          <li key={o.optionId} className="flex flex-col gap-1">
            <span className="text-sm">
              <span className={o.optionId === highlightOptionId ? "font-semibold" : ""}>
                {o.label}: {o.count} ({o.percent}%)
              </span>
              {o.optionId === highlightOptionId && <span className="text-ink-muted"> · your answer</span>}
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <span className="block h-full rounded-full bg-brand-600" style={{ width: `${o.percent}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-muted">
        {results.total} {results.total === 1 ? "response" : "responses"}
      </p>
    </div>
  );
}
