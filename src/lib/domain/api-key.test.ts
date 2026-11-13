import { describe, expect, it } from "vitest";

import { API_KEY_PATTERN, apiKeyPrefix, generateApiKey } from "./api-key";

const bytes = (fill: number) => new Uint8Array(32).fill(fill);

/** A byte source that returns the given chunks in order (then zeros), like crypto.randomBytes. */
function chunks(...parts: number[][]): (size: number) => Uint8Array {
  let i = 0;
  return (size) => {
    const part = parts[i++] ?? [];
    return Uint8Array.from({ length: size }, (_, j) => part[j] ?? 0);
  };
}

describe("generateApiKey (PRD §4.6)", () => {
  it("is hu_ followed by 32 base62 characters", () => {
    const key = generateApiKey((size) => crypto.getRandomValues(new Uint8Array(size)));
    expect(key).toMatch(/^hu_[0-9A-Za-z]{32}$/);
    expect(API_KEY_PATTERN.test(key)).toBe(true);
  });

  it("is deterministic for the same random bytes and differs for different bytes", () => {
    expect(generateApiKey(() => bytes(7))).toBe(generateApiKey(() => bytes(7)));
    expect(generateApiKey(() => bytes(7))).not.toBe(generateApiKey(() => bytes(8)));
  });

  it("skips bytes 248–255 so every character is equally likely (#63)", () => {
    // 256 = 4 × 62 + 8: keeping 248–255 would make "0"–"7" more likely than the other characters.
    // First 32 bytes: three skipped, then 29 kept; the next draw supplies the last 3.
    const key = generateApiKey(chunks([255, 250, 248, 1, ...Array<number>(28).fill(2)], [2, 2, 2]));
    expect(key).toBe(`hu_1${"2".repeat(31)}`);
  });

  it("keeps drawing bytes until it has 32 characters", () => {
    const key = generateApiKey(chunks(Array<number>(32).fill(255), Array<number>(32).fill(61)));
    expect(key).toBe(`hu_${"z".repeat(32)}`);
  });
});

describe("apiKeyPrefix", () => {
  it("is the first 8 characters, safe to show in lists", () => {
    expect(apiKeyPrefix("hu_abcdefghijklmnopqrstuvwxyz012345")).toBe("hu_abcde");
  });
});
