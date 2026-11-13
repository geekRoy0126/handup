import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api-docs (#63)", () => {
  it("loads every CDN script and stylesheet with an integrity hash and crossorigin", async () => {
    const html = await GET().text();
    const tags = html.match(/<(script|link)\b[^>]*cdn\.jsdelivr\.net[^>]*>/g) ?? [];
    expect(tags).toHaveLength(2);
    for (const tag of tags) {
      expect(tag).toMatch(/integrity="sha(256|384|512)-[A-Za-z0-9+/=]+"/);
      expect(tag).toMatch(/crossorigin(="anonymous")?/);
    }
  });
});
