import { beforeEach, describe, expect, it } from "vitest";

import { POST as join } from "@/app/api/v1/sessions/[code]/join/route";
import { GET as listQuestions, POST as ask } from "@/app/api/v1/sessions/[code]/questions/route";
import { ApiError } from "@/lib/api/http";
import { askQuestion } from "@/lib/server/services/question-service";
import { endSession } from "@/lib/server/services/session-service";
import { findSessionByCode } from "@/lib/server/services/access";

import { createLiveSession, createUser } from "./factories";
import { cookiePair, ctx, getSetCookie, jsonRequest, readJson, resetDb, TEST_NOW } from "./helpers";


type QuestionView = { id: string; body: string; authorName: string | null; isMine: boolean };
type ListBody = { data: { questions: QuestionView[] } };

beforeEach(resetDb);

async function joinAs(code: string, cookie?: string) {
  const res = await join(jsonRequest(`/api/v1/sessions/${code}/join`, { method: "POST", cookie }), ctx({ code }));
  const body = await readJson<{ data?: { guest: { id: string } }; error?: { message: string } }>(res);
  const setCookie = getSetCookie(res, "hu_guest");
  return { res, error: body.error, guestId: body.data?.guest.id, cookie: setCookie ? cookiePair(setCookie) : cookie };
}

function askAs(code: string, cookie: string | undefined, body: unknown) {
  return ask(jsonRequest(`/api/v1/sessions/${code}/questions`, { cookie, body }), ctx({ code }));
}

function listAs(code: string, auth: { cookie?: string; bearer?: string }) {
  return listQuestions(jsonRequest(`/api/v1/sessions/${code}/questions`, auth), ctx({ code }));
}

describe("POST /api/v1/sessions/[code]/join", () => {
  it("creates a guest and sets the hu_guest cookie", async () => {
    const { code } = await createLiveSession();
    const guest = await joinAs(code);
    expect(guest.res.status).toBe(200);
    expect(guest.guestId).toEqual(expect.any(String));
    expect(getSetCookie(guest.res, "hu_guest")).toMatch(/HttpOnly/i);
  });

  it("keeps the same guest when the cookie is sent again", async () => {
    const { code } = await createLiveSession();
    const first = await joinAs(code);
    const again = await joinAs(code, first.cookie);
    expect(again.guestId).toBe(first.guestId);
  });

  it("answers 409 'This session has ended.' for an ended session", async () => {
    const { code } = await createLiveSession();
    await endSession(await findSessionByCode(code), TEST_NOW);
    const { res, error } = await joinAs(code);
    expect(res.status).toBe(409);
    expect(error?.message).toBe("This session has ended.");
  });

  it("answers 404 for an unknown code", async () => {
    expect((await joinAs("ZZZZZZ")).res.status).toBe(404);
  });
});

describe("POST /api/v1/sessions/[code]/questions", () => {
  it("lets a guest ask, and the question appears on their board as theirs", async () => {
    const { code } = await createLiveSession();
    const guest = await joinAs(code);
    const res = await askAs(code, guest.cookie, { body: "What is a context window?" });
    expect(res.status).toBe(201);
    const { data } = await readJson<ListBody>(await listAs(code, { cookie: guest.cookie }));
    expect(data.questions).toHaveLength(1);
    expect(data.questions[0]).toMatchObject({ body: "What is a context window?", isMine: true });
  });

  it("never sends the name of an anonymous asker, not even to the host", async () => {
    const { code, hostToken } = await createLiveSession();
    const guest = await joinAs(code);
    await askAs(code, guest.cookie, { body: "Is this on the exam?", displayName: "Sam", isAnonymous: true });
    const hostView = await readJson<ListBody>(await listAs(code, { bearer: hostToken }));
    const other = await joinAs(code);
    const guestView = await readJson<ListBody>(await listAs(code, { cookie: other.cookie }));
    for (const view of [hostView, guestView]) {
      expect(view.data.questions[0]?.authorName).toBeNull();
      expect(JSON.stringify(view)).not.toContain("Sam");
    }
  });

  it("shows the display name of a named question", async () => {
    const { code } = await createLiveSession();
    const guest = await joinAs(code);
    await askAs(code, guest.cookie, { body: "Can you repeat that?", displayName: "Sam", isAnonymous: false });
    const { data } = await readJson<ListBody>(await listAs(code, { cookie: guest.cookie }));
    expect(data.questions[0]?.authorName).toBe("Sam");
  });

  it("answers 422 for a 2-character question", async () => {
    const { code } = await createLiveSession();
    const guest = await joinAs(code);
    expect((await askAs(code, guest.cookie, { body: "hi" })).status).toBe(422);
  });

  it("answers 401 without a guest pass", async () => {
    const { code } = await createLiveSession();
    expect((await askAs(code, undefined, { body: "Hello there" })).status).toBe(401);
  });

  it("answers 403 for a guest pass from another session", async () => {
    const a = await createLiveSession();
    const b = await createLiveSession();
    const guest = await joinAs(a.code);
    expect((await askAs(b.code, guest.cookie, { body: "Wrong room?" })).status).toBe(403);
  });

  it("answers 409 once the session has ended", async () => {
    const { code } = await createLiveSession();
    const guest = await joinAs(code);
    await endSession(await findSessionByCode(code), TEST_NOW);
    expect((await askAs(code, guest.cookie, { body: "Too late?" })).status).toBe(409);
  });
});

describe("question rate limit (PRD §4.2)", () => {
  it("allows 5 questions in 60 seconds and rejects the 6th with RATE_LIMITED", async () => {
    const { code } = await createLiveSession();
    const guest = await joinAs(code);
    const session = await findSessionByCode(code);
    const input = { body: "Question?", isAnonymous: true };
    for (let i = 0; i < 5; i += 1) await askQuestion(session, guest.guestId ?? "", input, TEST_NOW);
    const sixth = askQuestion(session, guest.guestId ?? "", input, new Date(TEST_NOW.getTime() + 59_000));
    await expect(sixth).rejects.toThrow(ApiError);
    await expect(sixth).rejects.toMatchObject({ code: "RATE_LIMITED", message: "Slow down — try again in a minute." });
  });

  it("allows a new question once the oldest of the 5 is more than 60 seconds old", async () => {
    const { code } = await createLiveSession();
    const guest = await joinAs(code);
    const session = await findSessionByCode(code);
    const input = { body: "Question?", isAnonymous: true };
    for (let i = 0; i < 5; i += 1) await askQuestion(session, guest.guestId ?? "", input, TEST_NOW);
    const later = new Date(TEST_NOW.getTime() + 61_000);
    await expect(askQuestion(session, guest.guestId ?? "", input, later)).resolves.toMatchObject({ body: "Question?" });
  });
});

describe("GET /api/v1/sessions/[code]/questions", () => {
  it("answers 401 for someone who has not joined", async () => {
    const { code } = await createLiveSession();
    expect((await listAs(code, {})).status).toBe(401);
  });

  it("lets a user who is not staff see nothing (403)", async () => {
    const { code } = await createLiveSession();
    const stranger = await createUser("Stranger");
    expect((await listAs(code, { bearer: stranger.token })).status).toBe(403);
  });
});
