import { describe, expect, it } from "vitest";

import { createSessionSchema } from "./session";

describe("createSessionSchema", () => {
  it("trims the title and accepts 3 to 80 characters", () => {
    expect(createSessionSchema.parse({ title: "  CS6983 Lecture 9 " }).title).toBe("CS6983 Lecture 9");
    expect(createSessionSchema.safeParse({ title: "abc" }).success).toBe(true);
    expect(createSessionSchema.safeParse({ title: "a".repeat(80) }).success).toBe(true);
  });

  it("rejects titles shorter than 3 or longer than 80 characters", () => {
    expect(createSessionSchema.safeParse({ title: " ab " }).success).toBe(false);
    expect(createSessionSchema.safeParse({ title: "a".repeat(81) }).success).toBe(false);
  });
});
