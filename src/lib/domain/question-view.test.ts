import { describe, expect, it } from "vitest";

import { toQuestionView, type QuestionRecord } from "./question-view";

const base: QuestionRecord = {
  id: "q1",
  body: "What is a context window?",
  isAnonymous: false,
  authorId: "g1",
  authorName: "Sam",
  status: "OPEN",
  isPinned: false,
  isHidden: false,
  createdAt: new Date("2026-11-12T15:00:00Z"),
  answeredAt: null,
  voterIds: ["g2", "g3"],
  mergedCount: 0,
};

describe("toQuestionView for a guest", () => {
  it("shows the author name of a named question", () => {
    expect(toQuestionView(base, { role: "GUEST", guestId: "g9" })?.authorName).toBe("Sam");
  });

  it("never shows the author name of an anonymous question", () => {
    const view = toQuestionView({ ...base, isAnonymous: true }, { role: "GUEST", guestId: "g9" });
    expect(view?.authorName).toBeNull();
    expect(JSON.stringify(view)).not.toContain("Sam");
  });

  it("hides hidden questions, even from their author", () => {
    expect(toQuestionView({ ...base, isHidden: true }, { role: "GUEST", guestId: "g1" })).toBeNull();
  });

  it("hides merged questions", () => {
    expect(toQuestionView({ ...base, status: "MERGED" }, { role: "GUEST", guestId: "g9" })).toBeNull();
  });

  it("marks the asker's own question and whether this guest voted", () => {
    expect(toQuestionView(base, { role: "GUEST", guestId: "g1" })).toMatchObject({ isMine: true, hasVoted: false });
    expect(toQuestionView(base, { role: "GUEST", guestId: "g2" })).toMatchObject({ isMine: false, hasVoted: true });
  });

  it("counts votes and does not expose voter ids or the author id", () => {
    const view = toQuestionView(base, { role: "GUEST", guestId: "g9" });
    expect(view?.votes).toBe(2);
    expect(JSON.stringify(view)).not.toMatch(/g1|g2|g3/);
  });

  it("does not expose the hidden flag to guests", () => {
    expect(toQuestionView(base, { role: "GUEST", guestId: "g9" })).not.toHaveProperty("isHidden");
  });
});

describe("toQuestionView for staff", () => {
  it("includes hidden questions with their flag", () => {
    expect(toQuestionView({ ...base, isHidden: true }, { role: "STAFF" })).toMatchObject({ isHidden: true });
  });

  it("still never shows the author name of an anonymous question", () => {
    expect(toQuestionView({ ...base, isAnonymous: true }, { role: "STAFF" })?.authorName).toBeNull();
  });

  it("hides merged questions", () => {
    expect(toQuestionView({ ...base, status: "MERGED" }, { role: "STAFF" })).toBeNull();
  });
});
