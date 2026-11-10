import { describe, expect, it } from "vitest";

import { API_KEY_PATTERN, apiKeyPrefix, generateApiKey } from "./api-key";

const bytes = (fill: number) => new Uint8Array(32).fill(fill);

describe("generateApiKey (PRD §4.6)", () => {
  it("is hu_ followed by 32 base62 characters", () => {
    const key = generateApiKey(crypto.getRandomValues(new Uint8Array(32)));
    expect(key).toMatch(/^hu_[0-9A-Za-z]{32}$/);
    expect(API_KEY_PATTERN.test(key)).toBe(true);
  });

  it("is deterministic for the same random bytes and differs for different bytes", () => {
    expect(generateApiKey(bytes(7))).toBe(generateApiKey(bytes(7)));
    expect(generateApiKey(bytes(7))).not.toBe(generateApiKey(bytes(8)));
  });

  it("needs 32 random bytes", () => {
    expect(() => generateApiKey(new Uint8Array(8))).toThrow();
  });
});

describe("apiKeyPrefix", () => {
  it("is the first 8 characters, safe to show in lists", () => {
    expect(apiKeyPrefix("hu_abcdefghijklmnopqrstuvwxyz012345")).toBe("hu_abcde");
  });
});
