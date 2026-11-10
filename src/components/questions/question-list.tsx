import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import type { QuestionItem } from "@/lib/client/use-questions";

import { QuestionCard } from "./question-card";

type QuestionListProps = {
  questions: QuestionItem[];
  renderVote?: (q: QuestionItem) => ReactNode;
  renderActions?: (q: QuestionItem) => ReactNode;
  emptyBody?: string;
};

/** Open questions first (in the order the server ranked them), then the "Answered" section. */
export function QuestionList({ questions, renderVote, renderActions, emptyBody }: QuestionListProps) {
  const open = questions.filter((q) => q.status === "OPEN");
  const answered = questions.filter((q) => q.status === "ANSWERED");

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="open-heading" className="flex flex-col gap-3">
        <h2 id="open-heading" className="text-lg font-semibold">
          Questions <span className="text-ink-muted">({open.length})</span>
        </h2>
        {open.length === 0 ? (
          <EmptyState title="No questions yet" body={emptyBody} />
        ) : (
          <ol className="flex flex-col gap-3">
            {open.map((q) => (
              <li key={q.id}>
                <QuestionCard question={q} voteSlot={renderVote?.(q)} actions={renderActions?.(q)} />
              </li>
            ))}
          </ol>
        )}
      </section>
      {answered.length > 0 && (
        <section aria-labelledby="answered-heading" className="flex flex-col gap-3">
          <h2 id="answered-heading" className="text-lg font-semibold">
            Answered <span className="text-ink-muted">({answered.length})</span>
          </h2>
          <ol className="flex flex-col gap-3">
            {answered.map((q) => (
              <li key={q.id}>
                <QuestionCard question={q} voteSlot={renderVote?.(q)} actions={renderActions?.(q)} />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
