// What each staff action does to a question (docs/PRD.md §4.3). Pure: the service applies the plan.
export type QuestionAction = "pin" | "unpin" | "answer" | "reopen" | "hide" | "unhide";

export type ActionTarget = { status: "OPEN" | "ANSWERED" | "MERGED"; isPinned: boolean; isHidden: boolean };

type QuestionPatch = {
  isPinned?: boolean;
  isHidden?: boolean;
  status?: "OPEN" | "ANSWERED";
  answeredAt?: Date | null;
};

export type ActionPlan =
  | { ok: true; data: QuestionPatch; unpinOthers: boolean }
  | { ok: false; reason: string };

const plan = (data: QuestionPatch, unpinOthers = false): ActionPlan => ({ ok: true, data, unpinOthers });
const refuse = (reason: string): ActionPlan => ({ ok: false, reason });

export function planQuestionAction(q: ActionTarget, action: QuestionAction, now: Date): ActionPlan {
  if (q.status === "MERGED") return refuse("This question was merged into another one.");
  switch (action) {
    case "pin":
      if (q.status !== "OPEN") return refuse("Only open questions can be pinned.");
      if (q.isHidden) return refuse("Unhide the question before pinning it.");
      return plan({ isPinned: true }, true); // At most one pinned question per session.
    case "unpin":
      return plan({ isPinned: false });
    case "answer":
      return plan({ status: "ANSWERED", answeredAt: now, isPinned: false });
    case "reopen":
      return plan({ status: "OPEN", answeredAt: null });
    case "hide":
      return plan({ isHidden: true, isPinned: false });
    case "unhide":
      return plan({ isHidden: false });
  }
}
