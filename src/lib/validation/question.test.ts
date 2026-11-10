import { describe, expect, it } from "vitest";

import { askQuestionSchema } from "./question";

describe("askQuestionSchema", () => {
  it("accepts 3 and 300 characters after trimming, rejects 2 and 301", () => {
    expect(askQuestionSchema.safeParse({ body: "  abc " }).success).toBe(true);
    expect(askQuestionSchema.safeParse({ body: "a".repeat(300) }).success).toBe(true);
    expect(askQuestionSchema.safeParse({ body: "ab" }).success).toBe(false);
    expect(askQuestionSchema.safeParse({ body: "a".repeat(301) }).success).toBe(false);
  });

  it("is anonymous by default", () => {
    expect(askQuestionSchema.parse({ body: "Why?!" }).isAnonymous).toBe(true);
  });

  it("treats a blank display name as no name and limits names to 40 characters", () => {
    expect(askQuestionSchema.parse({ body: "Why?!", displayName: "   " }).displayName).toBeUndefined();
    expect(askQuestionSchema.parse({ body: "Why?!", displayName: " Sam " }).displayName).toBe("Sam");
    expect(askQuestionSchema.safeParse({ body: "Why?!", displayName: "a".repeat(41) }).success).toBe(false);
  });
});
