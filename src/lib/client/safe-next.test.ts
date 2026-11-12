import { describe, expect, it } from "vitest";

import { DEFAULT_NEXT, safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps a same-site relative path", () => {
    expect(safeNext("/host/K7Q2XM")).toBe("/host/K7Q2XM");
  });

  it("falls back to the dashboard when there is no next", () => {
    expect(safeNext(null)).toBe(DEFAULT_NEXT);
    expect(safeNext("")).toBe(DEFAULT_NEXT);
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeNext("https://evil.com")).toBe(DEFAULT_NEXT);
    expect(safeNext("//evil.com")).toBe(DEFAULT_NEXT);
  });

  it("rejects a backslash after the first slash, which browsers treat as //", () => {
    expect(safeNext("/\\evil.com")).toBe(DEFAULT_NEXT);
    expect(safeNext("/\\/evil.com")).toBe(DEFAULT_NEXT);
  });

  it("rejects control characters that browsers strip before resolving the URL", () => {
    expect(safeNext("/\t/evil.com")).toBe(DEFAULT_NEXT);
    expect(safeNext("/\n/evil.com")).toBe(DEFAULT_NEXT);
  });
});
