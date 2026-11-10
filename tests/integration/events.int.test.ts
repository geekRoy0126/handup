import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as events } from "@/app/api/v1/sessions/[code]/events/route";
import { findSessionByCode } from "@/lib/server/services/access";
import { askQuestion } from "@/lib/server/services/question-service";

import { createGuest, createLiveSession } from "./factories";
import { ctx, jsonRequest, resetDb, TEST_NOW } from "./helpers";

beforeEach(async () => {
  process.env.SSE_POLL_MS = "50";
  await resetDb();
});
afterEach(() => {
  delete process.env.SSE_POLL_MS;
});

/** Reads the stream until `predicate` matches the accumulated text, or fails after 3 s. */
async function readUntil(reader: ReadableStreamDefaultReader<Uint8Array>, predicate: (text: string) => boolean) {
  const decoder = new TextDecoder();
  let text = "";
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    if (predicate(text)) return text;
  }
  throw new Error(`stream never matched; got: ${text}`);
}

describe("GET /api/v1/sessions/[code]/events", () => {
  it("streams text/event-stream, sends the current version, then 'changed' after a write", async () => {
    const { code } = await createLiveSession();
    const guest = await createGuest(code);
    const controller = new AbortController();
    const req = new Request(`http://localhost/api/v1/sessions/${code}/events`, {
      headers: { cookie: guest.cookie },
      signal: controller.signal,
    });
    const res = await events(req, ctx({ code }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    await readUntil(reader, (t) => t.includes("event: ready"));

    const session = await findSessionByCode(code);
    await askQuestion(session, guest.guestId, { body: "Live?", isAnonymous: true }, TEST_NOW);
    const text = await readUntil(reader, (t) => t.includes("event: changed"));
    expect(text).toMatch(/event: changed\ndata: \{"version":\d+\}/);
    expect(text).not.toContain("Live?");

    controller.abort();
    await reader.cancel().catch(() => {});
  });

  it("answers 401 for someone who has not joined", async () => {
    const { code } = await createLiveSession();
    const res = await events(jsonRequest(`/api/v1/sessions/${code}/events`), ctx({ code }));
    expect(res.status).toBe(401);
  });
});
