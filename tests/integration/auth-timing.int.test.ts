// Login must cost the same whether or not the email has an account, or response time reveals who is
// registered (#42). We check that bcrypt runs for an unknown email instead of timing requests (flaky in CI).
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/v1/auth/login/route";
import { verifyPassword } from "@/lib/server/auth/password";

import { jsonRequest, resetDb } from "./helpers";

vi.mock("@/lib/server/auth/password", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/auth/password")>();
  return { ...actual, verifyPassword: vi.fn(actual.verifyPassword) };
});

beforeEach(async () => {
  await resetDb();
  vi.mocked(verifyPassword).mockClear();
});

describe("POST /api/v1/auth/login timing", () => {
  it("still runs a bcrypt comparison when the email has no account", async () => {
    const res = await login(
      jsonRequest("/api/v1/auth/login", { body: { email: "nobody@example.com", password: "whatever1" } }),
    );
    expect(res.status).toBe(401);
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(vi.mocked(verifyPassword).mock.calls[0]?.[1]).toMatch(/^\$2[aby]\$12\$/);
  });
});
