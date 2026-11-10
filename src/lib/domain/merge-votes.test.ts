import { describe, expect, it } from "vitest";

import { mergeVotes } from "./merge-votes";

describe("mergeVotes (PRD §4.3)", () => {
  it("moves every source vote to the target when nobody voted for both", () => {
    expect(mergeVotes({ sourceVoterIds: ["a", "b"], targetVoterIds: ["c"], targetAuthorId: "z" })).toEqual({
      move: ["a", "b"],
      drop: [],
    });
  });

  it("drops the vote of a guest who already voted for the target, so nobody counts twice", () => {
    expect(mergeVotes({ sourceVoterIds: ["a", "b"], targetVoterIds: ["b"], targetAuthorId: "z" })).toEqual({
      move: ["a"],
      drop: ["b"],
    });
  });

  it("drops the vote of the target's author, who cannot vote on their own question", () => {
    expect(mergeVotes({ sourceVoterIds: ["z", "a"], targetVoterIds: [], targetAuthorId: "z" })).toEqual({
      move: ["a"],
      drop: ["z"],
    });
  });

  it("handles a source without votes", () => {
    expect(mergeVotes({ sourceVoterIds: [], targetVoterIds: ["a"], targetAuthorId: "z" })).toEqual({ move: [], drop: [] });
  });
});
