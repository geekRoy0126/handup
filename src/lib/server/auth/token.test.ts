// @vitest-environment node
// jose needs Node's Uint8Array/WebCrypto; jsdom's realm makes it reject keys.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getJwtSecret, signGuestToken, signUserToken, verifyToken } from "./token";

const NOW = new Date("2026-11-12T15:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const original = process.env.JWT_SECRET;

beforeEach(() => {
  process.env.JWT_SECRET = "a-test-secret-that-is-longer-than-32-characters";
});
afterEach(() => {
  process.env.JWT_SECRET = original;
});

describe("user tokens", () => {
  it("round-trips the user id", async () => {
    const token = await signUserToken("user-1", NOW);
    expect(await verifyToken(token, NOW)).toEqual({ kind: "user", sub: "user-1" });
  });

  it("are valid for 7 days and expired after", async () => {
    const token = await signUserToken("user-1", NOW);
    expect(await verifyToken(token, new Date(NOW.getTime() + 7 * DAY_MS - 1000))).not.toBeNull();
    expect(await verifyToken(token, new Date(NOW.getTime() + 7 * DAY_MS + 1000))).toBeNull();
  });
});

describe("guest tokens", () => {
  it("round-trips the guest id and its session id", async () => {
    const token = await signGuestToken("guest-1", "session-1", NOW);
    expect(await verifyToken(token, NOW)).toEqual({ kind: "guest", sub: "guest-1", sid: "session-1" });
  });

  it("expire after 24 hours", async () => {
    const token = await signGuestToken("guest-1", "session-1", NOW);
    expect(await verifyToken(token, new Date(NOW.getTime() + DAY_MS + 1000))).toBeNull();
  });
});

describe("verifyToken", () => {
  it("returns null for a tampered token", async () => {
    const token = await signUserToken("user-1", NOW);
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "admin", kind: "user" })).toString("base64url");
    expect(await verifyToken(`${header}.${forgedPayload}.${signature}`, NOW)).toBeNull();
  });

  it("returns null for a token signed with another secret", async () => {
    const token = await signUserToken("user-1", NOW);
    process.env.JWT_SECRET = "another-secret-that-is-also-longer-than-32-chars";
    expect(await verifyToken(token, NOW)).toBeNull();
  });

  it("returns null for garbage", async () => {
    expect(await verifyToken("not-a-jwt", NOW)).toBeNull();
  });
});

describe("getJwtSecret", () => {
  it("throws when JWT_SECRET is shorter than 32 characters", () => {
    process.env.JWT_SECRET = "short";
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });
});
