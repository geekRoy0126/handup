import { describe, expect, it } from "vitest";

import { inviteModeratorSchema } from "./moderator";

describe("inviteModeratorSchema", () => {
  it("trims and lowercases the email", () => {
    expect(inviteModeratorSchema.parse({ email: "  TA@Example.com " }).email).toBe("ta@example.com");
  });

  it("rejects something that is not an email", () => {
    expect(inviteModeratorSchema.safeParse({ email: "teaching assistant" }).success).toBe(false);
  });
});
