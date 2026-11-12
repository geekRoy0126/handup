import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "./auth";

const valid = { name: "Alice Host", email: "alice@example.com", password: "12345678" };

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("trims and lowercases the email", () => {
    expect(registerSchema.parse({ ...valid, email: "  Alice@Example.COM " }).email).toBe("alice@example.com");
  });

  it("accepts a password of exactly 8 characters and rejects 7", () => {
    expect(registerSchema.safeParse({ ...valid, password: "12345678" }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, password: "1234567" }).success).toBe(false);
  });

  it("requires a name of 1 to 80 characters after trimming", () => {
    expect(registerSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, name: "a".repeat(80) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, name: "a".repeat(81) }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("lowercases the email and requires a password", () => {
    expect(loginSchema.parse({ email: "A@B.CO", password: "x" }).email).toBe("a@b.co");
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
