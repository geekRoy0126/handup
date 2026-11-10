import { describe, expect, it } from "vitest";

import { createPollSchema } from "./poll";

const mc = (options: string[], prompt = "Which topic next?") => ({ kind: "MULTIPLE_CHOICE", prompt, options });

describe("createPollSchema", () => {
  it("accepts a multiple-choice poll with 2 to 6 options and trims them", () => {
    expect(createPollSchema.parse(mc([" RAG ", "Agents"]))).toMatchObject({ options: ["RAG", "Agents"] });
    expect(createPollSchema.safeParse(mc(["a", "b", "c", "d", "e", "f"])).success).toBe(true);
  });

  it("rejects 1 or 7 options, blank options and options over 80 characters", () => {
    expect(createPollSchema.safeParse(mc(["only"])).success).toBe(false);
    expect(createPollSchema.safeParse(mc(["a", "b", "c", "d", "e", "f", "g"])).success).toBe(false);
    expect(createPollSchema.safeParse(mc(["a", "  "])).success).toBe(false);
    expect(createPollSchema.safeParse(mc(["a", "b".repeat(81)])).success).toBe(false);
  });

  it("requires a prompt of 3 to 200 characters", () => {
    expect(createPollSchema.safeParse(mc(["a", "b"], "ab")).success).toBe(false);
    expect(createPollSchema.safeParse(mc(["a", "b"], "a".repeat(201))).success).toBe(false);
  });

  it("accepts a confidence poll with only a prompt", () => {
    expect(createPollSchema.parse({ kind: "CONFIDENCE", prompt: "How clear was that?" })).toEqual({
      kind: "CONFIDENCE",
      prompt: "How clear was that?",
    });
  });
});
