import { describe, expect, it } from "vitest";

import { planQuestionAction, type ActionTarget } from "./question-actions";

const NOW = new Date("2026-11-12T15:00:00Z");
const open: ActionTarget = { status: "OPEN", isPinned: false, isHidden: false };

describe("planQuestionAction", () => {
  it("pin sets isPinned and asks to unpin every other question", () => {
    expect(planQuestionAction(open, "pin", NOW)).toEqual({ ok: true, data: { isPinned: true }, unpinOthers: true });
  });

  it("unpin clears isPinned", () => {
    expect(planQuestionAction({ ...open, isPinned: true }, "unpin", NOW)).toEqual({
      ok: true,
      data: { isPinned: false },
      unpinOthers: false,
    });
  });

  it("answer marks the question answered at `now` and unpins it", () => {
    expect(planQuestionAction({ ...open, isPinned: true }, "answer", NOW)).toEqual({
      ok: true,
      data: { status: "ANSWERED", answeredAt: NOW, isPinned: false },
      unpinOthers: false,
    });
  });

  it("reopen moves an answered question back to open", () => {
    expect(planQuestionAction({ ...open, status: "ANSWERED" }, "reopen", NOW)).toEqual({
      ok: true,
      data: { status: "OPEN", answeredAt: null },
      unpinOthers: false,
    });
  });

  it("refuses to pin an answered or hidden question", () => {
    expect(planQuestionAction({ ...open, status: "ANSWERED" }, "pin", NOW).ok).toBe(false);
    expect(planQuestionAction({ ...open, isHidden: true }, "pin", NOW).ok).toBe(false);
  });

  it("refuses every action on a merged question", () => {
    for (const action of ["pin", "unpin", "answer", "reopen", "hide", "unhide"] as const) {
      expect(planQuestionAction({ ...open, status: "MERGED" }, action, NOW).ok).toBe(false);
    }
  });

  it("hide hides and unpins; unhide shows again", () => {
    expect(planQuestionAction({ ...open, isPinned: true }, "hide", NOW)).toEqual({
      ok: true,
      data: { isHidden: true, isPinned: false },
      unpinOthers: false,
    });
    expect(planQuestionAction({ ...open, isHidden: true }, "unhide", NOW)).toEqual({
      ok: true,
      data: { isHidden: false },
      unpinOthers: false,
    });
  });
});
