import { beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { GET as me } from "@/app/api/v1/auth/me/route";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { signGuestToken } from "@/lib/server/auth/token";
import { db } from "@/lib/server/db";

import { cookiePair, getSetCookie, jsonRequest, readJson, resetDb } from "./helpers";

type AuthBody = { data: { user: { id: string; name: string; email: string }; token: string } };

const alice = { name: "Alice Host", email: "alice@example.com", password: "correct-horse" };

function registerAlice() {
  return register(jsonRequest("/api/v1/auth/register", { body: alice }));
}

beforeEach(resetDb);

describe("POST /api/v1/auth/register", () => {
  it("creates the account, returns a token and sets an httpOnly hu_session cookie", async () => {
    const res = await registerAlice();
    expect(res.status).toBe(201);
    const body = await readJson<AuthBody>(res);
    expect(body.data.user).toMatchObject({ name: "Alice Host", email: "alice@example.com" });
    expect(body.data.token).toEqual(expect.any(String));
    const cookie = getSetCookie(res, "hu_session");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
  });

  it("stores a bcrypt hash with cost 12 instead of the password", async () => {
    await registerAlice();
    const user = await db.user.findUniqueOrThrow({ where: { email: alice.email } });
    expect(user.passwordHash).not.toBe(alice.password);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("never returns passwordHash", async () => {
    const res = await registerAlice();
    expect(JSON.stringify(await res.json())).not.toContain("passwordHash");
  });

  it("rejects a duplicate email, ignoring case, with 409", async () => {
    await registerAlice();
    const res = await register(
      jsonRequest("/api/v1/auth/register", { body: { ...alice, email: "ALICE@Example.com" } }),
    );
    expect(res.status).toBe(409);
    expect((await readJson(res)).error?.message).toBe("An account with this email already exists.");
  });

  it("answers one 201 and one 409, never a 500, when the same email registers twice at once (#42)", async () => {
    const statuses = (await Promise.all([registerAlice(), registerAlice()])).map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);
    expect(await db.user.count({ where: { email: alice.email } })).toBe(1);
  });

  it("rejects a password shorter than 8 characters with 422", async () => {
    const res = await register(
      jsonRequest("/api/v1/auth/register", { body: { ...alice, password: "1234567" } }),
    );
    expect(res.status).toBe(422);
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await registerAlice();
  });

  it("returns a token and sets the cookie for correct credentials", async () => {
    const res = await login(
      jsonRequest("/api/v1/auth/login", { body: { email: alice.email, password: alice.password } }),
    );
    expect(res.status).toBe(200);
    expect((await readJson<AuthBody>(res)).data.token).toEqual(expect.any(String));
    expect(getSetCookie(res, "hu_session")).toBeDefined();
  });

  it("answers a wrong password with 401 and the generic message", async () => {
    const res = await login(
      jsonRequest("/api/v1/auth/login", { body: { email: alice.email, password: "wrong-password" } }),
    );
    expect(res.status).toBe(401);
    expect((await readJson(res)).error?.message).toBe("Email or password is incorrect.");
  });

  it("answers an unknown email with the same message", async () => {
    const res = await login(
      jsonRequest("/api/v1/auth/login", { body: { email: "nobody@example.com", password: "whatever1" } }),
    );
    expect(res.status).toBe(401);
    expect((await readJson(res)).error?.message).toBe("Email or password is incorrect.");
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("clears the hu_session cookie", async () => {
    const res = await logout(jsonRequest("/api/v1/auth/logout", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(getSetCookie(res, "hu_session")).toMatch(/Max-Age=0/i);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns the user for a Bearer token", async () => {
    const { data } = await readJson<AuthBody>(await registerAlice());
    const res = await me(jsonRequest("/api/v1/auth/me", { bearer: data.token }));
    expect(res.status).toBe(200);
    expect((await readJson<{ data: { user: { email: string } } }>(res)).data.user.email).toBe(alice.email);
  });

  it("returns the user for the session cookie", async () => {
    const cookie = cookiePair(getSetCookie(await registerAlice(), "hu_session"));
    const res = await me(jsonRequest("/api/v1/auth/me", { cookie }));
    expect(res.status).toBe(200);
  });

  it("answers 401 without a token", async () => {
    const res = await me(jsonRequest("/api/v1/auth/me"));
    expect(res.status).toBe(401);
  });

  it("answers 401 for a guest token", async () => {
    const token = await signGuestToken("guest-1", "session-1", new Date());
    const res = await me(jsonRequest("/api/v1/auth/me", { bearer: token }));
    expect(res.status).toBe(401);
  });
});
