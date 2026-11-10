// Visibility rules for questions (docs/PRD.md §4.2–4.3). Every question that leaves the server goes through here.
export type QuestionStatus = "OPEN" | "ANSWERED" | "MERGED";

export type QuestionRecord = {
  id: string;
  body: string;
  isAnonymous: boolean;
  authorId: string;
  authorName: string | null;
  status: QuestionStatus;
  isPinned: boolean;
  isHidden: boolean;
  createdAt: Date;
  answeredAt: Date | null;
  voterIds: string[];
  mergedCount: number;
};

export type QuestionView = {
  id: string;
  body: string;
  /** null when anonymous or no name was given; the UI shows "Anonymous". */
  authorName: string | null;
  status: "OPEN" | "ANSWERED";
  isPinned: boolean;
  createdAt: Date;
  answeredAt: Date | null;
  votes: number;
  hasVoted: boolean;
  isMine: boolean;
  mergedCount: number;
};

export type StaffQuestionView = QuestionView & { isHidden: boolean };

export type QuestionViewer = { role: "GUEST"; guestId: string } | { role: "STAFF" };

export function toQuestionView(q: QuestionRecord, viewer: { role: "GUEST"; guestId: string }): QuestionView | null;
export function toQuestionView(q: QuestionRecord, viewer: { role: "STAFF" }): StaffQuestionView | null;
export function toQuestionView(q: QuestionRecord, viewer: QuestionViewer): QuestionView | StaffQuestionView | null;
export function toQuestionView(q: QuestionRecord, viewer: QuestionViewer): QuestionView | StaffQuestionView | null {
  if (q.status === "MERGED") return null;
  if (q.isHidden && viewer.role === "GUEST") return null;
  const guestId = viewer.role === "GUEST" ? viewer.guestId : null;
  const view: QuestionView = {
    id: q.id,
    body: q.body,
    authorName: q.isAnonymous ? null : q.authorName,
    status: q.status,
    isPinned: q.isPinned,
    createdAt: q.createdAt,
    answeredAt: q.answeredAt,
    votes: q.voterIds.length,
    hasVoted: guestId !== null && q.voterIds.includes(guestId),
    isMine: guestId !== null && q.authorId === guestId,
    mergedCount: q.mergedCount,
  };
  return viewer.role === "STAFF" ? { ...view, isHidden: q.isHidden } : view;
}
