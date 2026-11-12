import { beforeEach, describe, expect, it } from "vitest";

import { POST as endSession } from "@/app/api/v1/sessions/[code]/end/route";
import { GET as getSession } from "@/app/api/v1/sessions/[code]/route";
import { GET as listSessions, POST as createSessionRoute } from "@/app/api/v1/sessions/route";
import { createSession } from "@/lib/server/services/session-service";

import { createGuest, createUser } from "./factories";
import { ctx, jsonRequest, readJson, resetDb, TEST_NOW } from "./helpers";

type SessionDto = { code: string; title: string; status: string; endedAt: string | null; role?: string };
type SessionBody = { data: { session: SessionDto } };

beforeEach(resetDb);

async function create(token: string, title = "CS6983 Lecture 9") {
  return createSessionRoute(jsonRequest("/api/v1/sessions", { bearer: token, body: { title } }));
}

async function createCode(token: string, title?: string): Promise<string> {
  return (await readJson<SessionBody>(await create(token, title))).data.session.code;
}

describe("POST /api/v1/sessions", () => {
  it("creates a LIVE session with a 6-character join code", async () => {
    const host = await createUser();
    const res = await create(host.token);
    expect(res.status).toBe(201);
    const { data } = await readJson<SessionBody>(res);
    expect(data.session).toMatchObject({ title: "CS6983 Lecture 9", status: "LIVE" });
    expect(data.session.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  });

  it("answers 401 without a token", async () => {
    const res = await createSessionRoute(jsonRequest("/api/v1/sessions", { body: { title: "Talk" } }));
    expect(res.status).toBe(401);
  });

  it("answers 422 for a title shorter than 3 characters", async () => {
    const host = await createUser();
    expect((await create(host.token, "ab")).status).toBe(422);
  });

  it("draws a new code when the first one is already taken", async () => {
    const host = await createUser();
    const first = await createSession({ hostId: host.user.id, title: "First" }, TEST_NOW, () => 0);
    const values = [0, 0, 0, 0, 0, 0, 0.5];
    let i = 0;
    const second = await createSession({ hostId: host.user.id, title: "Second" }, TEST_NOW, () => values[i++] ?? 0.5);
    expect(first.code).toBe("AAAAAA");
    expect(second.code).not.toBe("AAAAAA");
  });
});

describe("GET /api/v1/sessions", () => {
  it("lists only my sessions, newest first, with my role", async () => {
    const host = await createUser();
    const other = await createUser("Other");
    await create(host.token, "Older talk");
    await create(host.token, "Newer talk");
    await create(other.token, "Not mine");
    const res = await listSessions(jsonRequest("/api/v1/sessions", { bearer: host.token }));
    const { data } = await readJson<{ data: { sessions: SessionDto[] } }>(res);
    expect(data.sessions.map((s) => s.title)).toEqual(["Newer talk", "Older talk"]);
    expect(data.sessions.every((s) => s.role === "HOST")).toBe(true);
  });
});

describe("GET /api/v1/sessions/[code]", () => {
  it("finds the session from a lowercase, dashed code and reports the host role", async () => {
    const host = await createUser();
    const code = await createCode(host.token);
    const messy = `${code.slice(0, 3).toLowerCase()}-${code.slice(3).toLowerCase()}`;
    const res = await getSession(jsonRequest(`/api/v1/sessions/${messy}`, { bearer: host.token }), ctx({ code: messy }));
    expect(res.status).toBe(200);
    const body = await readJson<{ data: { session: SessionDto; viewer: { role: string | null } } }>(res);
    expect(body.data.session.code).toBe(code);
    expect(body.data.viewer.role).toBe("HOST");
  });

  it("reports no role for an anonymous visitor", async () => {
    const host = await createUser();
    const code = await createCode(host.token);
    const res = await getSession(jsonRequest(`/api/v1/sessions/${code}`), ctx({ code }));
    const body = await readJson<{ data: { viewer: { role: string | null } } }>(res);
    expect(body.data.viewer.role).toBeNull();
  });

  it("answers 404 with 'No session with that code.' for an unknown or invalid code", async () => {
    for (const code of ["ZZZZZZ", "nope"]) {
      const res = await getSession(jsonRequest(`/api/v1/sessions/${code}`), ctx({ code }));
      expect(res.status).toBe(404);
      expect((await readJson(res)).error?.message).toBe("No session with that code.");
    }
  });
});

describe("POST /api/v1/sessions/[code]/end", () => {
  it("lets the host end the session", async () => {
    const host = await createUser();
    const code = await createCode(host.token);
    const req = jsonRequest(`/api/v1/sessions/${code}/end`, { method: "POST", bearer: host.token });
    const res = await endSession(req, ctx({ code }));
    expect(res.status).toBe(200);
    const body = await readJson<SessionBody>(res);
    expect(body.data.session.status).toBe("ENDED");
    expect(body.data.session.endedAt).toEqual(expect.any(String));
  });

  it("answers 403 for a user who is not the host", async () => {
    const host = await createUser();
    const other = await createUser("Other");
    const code = await createCode(host.token);
    const req = jsonRequest(`/api/v1/sessions/${code}/end`, { method: "POST", bearer: other.token });
    expect((await endSession(req, ctx({ code }))).status).toBe(403);
  });

  it("answers 401 without a token (#40)", async () => {
    const host = await createUser();
    const code = await createCode(host.token);
    const req = jsonRequest(`/api/v1/sessions/${code}/end`, { method: "POST" });
    expect((await endSession(req, ctx({ code }))).status).toBe(401);
  });

  it("answers 403 for a guest of this session (#40)", async () => {
    const host = await createUser();
    const code = await createCode(host.token);
    const guest = await createGuest(code);
    const req = jsonRequest(`/api/v1/sessions/${code}/end`, { method: "POST", cookie: guest.cookie });
    expect((await endSession(req, ctx({ code }))).status).toBe(403);
  });
});
