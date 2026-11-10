import { describe, expect, it } from "vitest";

import { formatJoinCode, generateJoinCode, JOIN_CODE_ALPHABET, normalizeJoinCode } from "./join-code";

/** Returns the given values in order, then repeats the last one. */
function sequence(...values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

describe("JOIN_CODE_ALPHABET", () => {
  it("leaves out look-alike characters 0, O, 1, I and L", () => {
    for (const ch of ["0", "O", "1", "I", "L"]) expect(JOIN_CODE_ALPHABET).not.toContain(ch);
    expect(JOIN_CODE_ALPHABET).toHaveLength(31);
  });
});

describe("generateJoinCode", () => {
  it("returns 6 characters from the alphabet", () => {
    expect(generateJoinCode(Math.random)).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  });

  it("maps 0 to the first and almost-1 to the last alphabet character", () => {
    expect(generateJoinCode(sequence(0))).toBe("AAAAAA");
    expect(generateJoinCode(sequence(0.9999))).toBe("999999");
  });

  it("is deterministic for the same random source", () => {
    expect(generateJoinCode(sequence(0.1, 0.2, 0.3, 0.4, 0.5, 0.6))).toBe(
      generateJoinCode(sequence(0.1, 0.2, 0.3, 0.4, 0.5, 0.6)),
    );
  });
});

describe("normalizeJoinCode", () => {
  it("uppercases and removes spaces and dashes", () => {
    expect(normalizeJoinCode("k7q 2xm")).toBe("K7Q2XM");
    expect(normalizeJoinCode(" K7Q-2XM ")).toBe("K7Q2XM");
  });

  it("returns null for the wrong length", () => {
    expect(normalizeJoinCode("K7Q2X")).toBeNull();
    expect(normalizeJoinCode("K7Q2XMM")).toBeNull();
  });

  it("returns null for characters outside the alphabet", () => {
    expect(normalizeJoinCode("K7Q2XO")).toBeNull();
    expect(normalizeJoinCode("K7Q2X!")).toBeNull();
  });
});

describe("formatJoinCode", () => {
  it("adds a dash after the third character", () => {
    expect(formatJoinCode("K7Q2XM")).toBe("K7Q-2XM");
  });
});
