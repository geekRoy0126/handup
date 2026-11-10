// Board order (docs/PRD.md §4.3): pinned first, then most votes, then older first; answered ones after,
// most recently answered first.
export type Rankable = {
  status: "OPEN" | "ANSWERED";
  isPinned: boolean;
  votes: number;
  createdAt: Date;
  answeredAt: Date | null;
};

function compareOpen(a: Rankable, b: Rankable): number {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  if (a.votes !== b.votes) return b.votes - a.votes;
  return a.createdAt.getTime() - b.createdAt.getTime(); // Ties go to the older question (#6).
}

function compareAnswered(a: Rankable, b: Rankable): number {
  return (b.answeredAt?.getTime() ?? 0) - (a.answeredAt?.getTime() ?? 0);
}

export function rankQuestions<T extends Rankable>(questions: readonly T[]): T[] {
  const open = questions.filter((q) => q.status === "OPEN").sort(compareOpen);
  const answered = questions.filter((q) => q.status === "ANSWERED").sort(compareAnswered);
  return [...open, ...answered];
}
