import type { ReactNode } from "react";

import type { QuestionItem } from "@/lib/client/use-questions";

type QuestionCardProps = { question: QuestionItem; voteSlot?: ReactNode; actions?: ReactNode };

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function QuestionCard({ question, voteSlot, actions }: QuestionCardProps) {
  const { isPinned, isHidden, status } = question;
  const border = isPinned ? "border-status-pinned border-2" : "border-line";
  return (
    <article
      aria-label={question.body}
      className={`flex gap-4 rounded-xl border bg-surface p-4 ${border} ${isHidden ? "bg-surface-muted" : ""}`}
    >
      {voteSlot}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {isPinned && <span className="text-status-pinned">● Now answering</span>}
          {status === "ANSWERED" && <span className="text-status-answered">✓ Answered</span>}
          {isHidden && <span className="text-status-hidden">Hidden</span>}
          {question.mergedCount > 0 && <span className="text-ink-muted">+{question.mergedCount} merged</span>}
        </div>
        <p className={`text-base break-words whitespace-pre-wrap ${isHidden ? "text-ink-muted" : ""}`}>{question.body}</p>
        <p className="text-sm text-ink-muted">
          {question.authorName ?? "Anonymous"}
          {question.isMine && " (you)"} · {timeFormat.format(new Date(question.createdAt))}
        </p>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </article>
  );
}
