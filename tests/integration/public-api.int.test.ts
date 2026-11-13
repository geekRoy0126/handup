import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { DELETE as revokeKey } from "@/app/api/v1/api-keys/[id]/route";
import { GET as listKeys, POST as createKey } from "@/app/api/v1/api-keys/route";
import { GET as publicPolls } from "@/app/api/v1/public/sessions/[code]/polls/route";
import { GET as summary, OPTIONS as preflight } from "@/app/api/v1/public/sessions/[code]/summary/route";
import { db } from "@/lib/server/db";
import { findSessionByCode } from "@/lib/server/services/access";
import { createPoll } from "@/lib/server/services/poll-service";
import { askQuestion } from "@/lib/server/services/question-service";

import { createGuest, createLiveSession } from "./factories";
import { ctx, jsonRequest, readJson, resetDb, TEST_NOW } from "./helpers";

type KeyBody = { data: { key: string; apiKey: { id: string; prefix: string; name: string } } };

beforeEach(resetDb);

async function setup() {
  const live = await createLiveSession();
  const session = await findSessionByCode(live.code);
  const guest = await createGuest(live.code);
  await askQuestion(session, guest.guestId, { body: "Public question", isAnonymous: true }, TEST_NOW);
  await askQuestion(session, guest.guestId, { body: "Rude question", isAnonymous: true }, TEST_NOW);
  await db.question.updateMany({ where: { body: "Rude question" }, data: { isHidden: true } });
  await createPoll(session, { kind: "MULTIPLE_CHOICE", prompt: "Which topic?", options: ["RAG", "Agents"] }, TEST_NOW);
  const created = await readJson<KeyBody>(
    await createKey(jsonRequest("/api/v1/api-keys", { bearer: live.hostToken, body: { name: "Course site" } })),
  );
  return { ...live, key: created.data.key, apiKey: created.data.apiKey };
}

function summaryWith(code: string, key?: string) {
  return summary(jsonRequest(`/api/v1/public/sessions/${code}/summary`, { headers: key ? { "x-api-key": key } : {} }), ctx({ code }));
}

describe("API keys", () => {
  it("returns the full key once and stores only its hash and prefix", async () => {
    const { key, apiKey } = await setup();
    expect(key).toMatch(/^hu_[0-9A-Za-z]{32}$/);
    expect(apiKey.prefix).toBe(key.slice(0, 8));
    const row = await db.apiKey.findUniqueOrThrow({ where: { id: apiKey.id } });
    expect(row.hash).not.toContain(key);
    expect(JSON.stringify(row)).not.toContain(key);
  });

  it("lists my keys without the secret", async () => {
    const { hostToken, key } = await setup();
    const res = await listKeys(jsonRequest("/api/v1/api-keys", { bearer: hostToken }));
    const text = JSON.stringify(await res.json());
    expect(text).toContain("Course site");
    expect(text).not.toContain(key);
  });

  it("answers 401 without login", async () => {
    expect((await listKeys(jsonRequest("/api/v1/api-keys"))).status).toBe(401);
  });
});

describe("GET /api/v1/public/sessions/[code]/summary (PRD US10)", () => {
  it("returns totals and questions with the same visibility rules as the report", async () => {
    const { code, key } = await setup();
    const res = await summaryWith(code, key);
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const { data } = await readJson<{ data: { session: { code: string }; totals: { questions: number }; topQuestions: { body: string }[] } }>(res);
    expect(data.session.code).toBe(code);
    expect(data.topQuestions.map((q) => q.body)).toEqual(["Public question"]);
  });

  it("answers 401 for a missing, unknown or revoked key", async () => {
    const { code, key, apiKey, hostToken } = await setup();
    expect((await summaryWith(code)).status).toBe(401);
    expect((await summaryWith(code, "hu_00000000000000000000000000000000")).status).toBe(401);
    await revokeKey(jsonRequest(`/api/v1/api-keys/${apiKey.id}`, { method: "DELETE", bearer: hostToken }), ctx({ id: apiKey.id }));
    expect((await summaryWith(code, key)).status).toBe(401);
  });

  it("answers 404 for a session that belongs to someone else, so codes can't be probed", async () => {
    const { key } = await setup();
    const other = await createLiveSession();
    expect((await summaryWith(other.code, key)).status).toBe(404);
  });

  it("records when the key was last used", async () => {
    const { code, key, apiKey } = await setup();
    await summaryWith(code, key);
    expect((await db.apiKey.findUniqueOrThrow({ where: { id: apiKey.id } })).lastUsedAt).toBeInstanceOf(Date);
  });

  it("answers CORS preflight requests", async () => {
    const res = await preflight();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("x-api-key");
  });
});

describe("GET /api/v1/public/sessions/[code]/polls", () => {
  it("returns poll results", async () => {
    const { code, key } = await setup();
    const res = await publicPolls(jsonRequest(`/api/v1/public/sessions/${code}/polls`, { headers: { "x-api-key": key } }), ctx({ code }));
    const { data } = await readJson<{ data: { polls: { prompt: string; results: { total: number } }[] } }>(res);
    expect(data.polls).toEqual([expect.objectContaining({ prompt: "Which topic?", results: expect.objectContaining({ total: 0 }) })]);
  });
});

describe("public/openapi.json", () => {
  async function routeFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map((e) => (e.isDirectory() ? routeFiles(path.join(dir, e.name)) : Promise.resolve(e.name === "route.ts" ? [path.join(dir, e.name)] : []))),
    );
    return nested.flat();
  }

  it("documents every /api/v1 route", async () => {
    const spec = JSON.parse(await readFile("public/openapi.json", "utf8")) as { paths: Record<string, unknown> };
    const root = path.join("src", "app");
    const files = await routeFiles(path.join(root, "api", "v1"));
    const documented = Object.keys(spec.paths);
    for (const file of files) {
      const route = `/${path.relative(root, path.dirname(file)).split(path.sep).join("/")}`.replace(/\[(\w+)\]/g, "{$1}");
      expect(documented, `missing ${route} in openapi.json`).toContain(route);
    }
  });

  it("documents the summary response fields the endpoint really returns", async () => {
    const spec = JSON.parse(await readFile("public/openapi.json", "utf8")) as {
      components: { schemas: Record<string, { required?: string[] }> };
    };
    const { code, key } = await setup();
    const { data } = await readJson<{ data: Record<string, unknown> }>(await summaryWith(code, key));
    for (const field of spec.components.schemas.SessionSummary?.required ?? []) expect(data).toHaveProperty(field);
    expect(spec.components.schemas.SessionSummary?.required).toEqual(
      expect.arrayContaining(["session", "totals", "topQuestions", "unanswered"]),
    );
  });
});
