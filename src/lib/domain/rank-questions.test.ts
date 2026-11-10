import { describe, expect, it } from "vitest";

import { rankQuestions, type Rankable } from "./rank-questions";

function q(id: string, overrides: Partial<Rankable> = {}): Rankable & { id: string } {
  return {
    id,
    status: "OPEN",
    isPinned: false,
    votes: 0,
    createdAt: new Date("2026-11-12T15:00:00Z"),
    answeredAt: null,
    ...overrides,
  };
}

const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe("rankQuestions (PRD §4.3)", () => {
  it("orders open questions by votes, most first", () => {
    expect(ids(rankQuestions([q("a", { votes: 1 }), q("b", { votes: 5 }), q("c", { votes: 3 })]))).toEqual(["b", "c", "a"]);
  });

  it("puts the pinned question first even when it has fewer votes", () => {
    expect(ids(rankQuestions([q("a", { votes: 9 }), q("p", { votes: 0, isPinned: true })]))).toEqual(["p", "a"]);
  });

  it("breaks vote ties by putting the older question first", () => {
    const older = q("older", { votes: 2, createdAt: new Date("2026-11-12T15:00:00Z") });
    const newer = q("newer", { votes: 2, createdAt: new Date("2026-11-12T15:05:00Z") });
    expect(ids(rankQuestions([newer, older]))).toEqual(["older", "newer"]);
  });

  it("lists answered questions after open ones, most recently answered first", () => {
    const early = q("early", { status: "ANSWERED", votes: 10, answeredAt: new Date("2026-11-12T15:10:00Z") });
    const late = q("late", { status: "ANSWERED", votes: 0, answeredAt: new Date("2026-11-12T15:20:00Z") });
    expect(ids(rankQuestions([early, q("open"), late]))).toEqual(["open", "late", "early"]);
  });

  it("does not change the input array", () => {
    const input = [q("a"), q("b", { votes: 1 })];
    rankQuestions(input);
    expect(ids(input)).toEqual(["a", "b"]);
  });
});
