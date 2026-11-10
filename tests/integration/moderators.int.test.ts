import { beforeEach, describe, expect, it } from "vitest";

import { PATCH as act } from "@/app/api/v1/questions/[id]/route";
import { POST as endSession } from "@/app/api/v1/sessions/[code]/end/route";
import { DELETE as removeModerator } from "@/app/api/v1/sessions/[code]/moderators/[userId]/route";
import { GET as listModerators, POST as invite } from "@/app/api/v1/sessions/[code]/moderators/route";
import { GET as listQuestions } from "@/app/api/v1/sessions/[code]/questions/route";
import { GET as getSession } from "@/app/api/v1/sessions/[code]/route";
import { GET as listSessions } from "@/app/api/v1/sessions/route";
import { getSessionVersion } from "@/lib/server/realtime";
import { findSessionByCode } from "@/lib/server/services/access";
import { askQuestion } from "@/lib/server/services/question-service";

import { createGuest, createLiveSession, createUser } from "./factories";
import { ctx, jsonRequest, readJson, resetDb, TEST_NOW } from "./helpers";

type Questions = { data: { questions: { id: string; isHidden?: boolean }[] } };

beforeEach(resetDb);

async function setup() {
  const live = await createLiveSession();
  const ta = await createUser("Teaching Assistant");
  const session = await findSessionByCode(live.code);
  const guest = await createGuest(live.code);
  const question = await askQuestion(session, guest.guestId, { body: "Something rude", isAnonymous: true }, TEST_NOW);
  return { ...live, ta, session, guest, question };
}

function inviteAs(code: string, token: string, email: string) {
  return invite(jsonRequest(`/api/v1/sessions/${code}/moderators`, { bearer: token, body: { email } }), ctx({ code }));
}

function actAs(id: string, action: string, auth: { bearer?: string; cookie?: string }) {
  return act(jsonRequest(`/api/v1/questions/${id}`, { method: "PATCH", body: { action }, ...auth }), ctx({ id }));
}

function questionsAs(code: string, auth: { bearer?: string; cookie?: string }) {
  return listQuestions(jsonRequest(`/api/v1/sessions/${code}/questions`, auth), ctx({ code }));
}

describe("inviting moderators (PRD US6)", () => {
  it("lets the host invite an existing account by email, ignoring case", async () => {
    const { code, hostToken, ta } = await setup();
    const res = await inviteAs(code, hostToken, ta.user.email.toUpperCase());
    expect(res.status).toBe(201);
    const list = await readJson<{ data: { moderators: { email: string; name: string }[] } }>(
      await listModerators(jsonRequest(`/api/v1/sessions/${code}/moderators`, { bearer: hostToken }), ctx({ code })),
    );
    expect(list.data.moderators).toEqual([expect.objectContaining({ email: ta.user.email, name: "Teaching Assistant" })]);
  });

  it("answers 404 'No HandUp account with this email.' for an unknown email", async () => {
    const { code, hostToken } = await setup();
    const res = await inviteAs(code, hostToken, "nobody@example.com");
    expect(res.status).toBe(404);
    expect((await readJson(res)).error?.message).toBe("No HandUp account with this email.");
  });

  it("shows the session on the moderator's dashboard and in their viewer role", async () => {
    const { code, hostToken, ta } = await setup();
    await inviteAs(code, hostToken, ta.user.email);
    const mine = await readJson<{ data: { sessions: { code: string; role: string }[] } }>(
      await listSessions(jsonRequest("/api/v1/sessions", { bearer: ta.token })),
    );
    expect(mine.data.sessions).toEqual([expect.objectContaining({ code, role: "MODERATOR" })]);
    const info = await readJson<{ data: { viewer: { role: string } } }>(
      await getSession(jsonRequest(`/api/v1/sessions/${code}`, { bearer: ta.token }), ctx({ code })),
    );
    expect(info.data.viewer.role).toBe("MODERATOR");
  });

  it("does not let a moderator invite others or end the session (403)", async () => {
    const { code, hostToken, ta } = await setup();
    await inviteAs(code, hostToken, ta.user.email);
    const other = await createUser("Other");
    expect((await inviteAs(code, ta.token, other.user.email)).status).toBe(403);
    const end = await endSession(jsonRequest(`/api/v1/sessions/${code}/end`, { method: "POST", bearer: ta.token }), ctx({ code }));
    expect(end.status).toBe(403);
  });

  it("removing a moderator takes their staff access away", async () => {
    const { code, hostToken, ta, question } = await setup();
    await inviteAs(code, hostToken, ta.user.email);
    const req = jsonRequest(`/api/v1/sessions/${code}/moderators/${ta.user.id}`, { method: "DELETE", bearer: hostToken });
    expect((await removeModerator(req, ctx({ code, userId: ta.user.id }))).status).toBe(200);
    expect((await actAs(question.id, "hide", { bearer: ta.token })).status).toBe(403);
  });
});

describe("hide and unhide (PRD §4.3)", () => {
  it("a moderator hides a question: guests stop seeing it, staff see it flagged; unhide restores it", async () => {
    const { code, hostToken, ta, guest, question, session } = await setup();
    await inviteAs(code, hostToken, ta.user.email);
    const before = await getSessionVersion(session.id);

    expect((await actAs(question.id, "hide", { bearer: ta.token })).status).toBe(200);
    expect(await getSessionVersion(session.id)).toBe(before + 1);
    expect((await readJson<Questions>(await questionsAs(code, { cookie: guest.cookie }))).data.questions).toEqual([]);
    expect((await readJson<Questions>(await questionsAs(code, { bearer: ta.token }))).data.questions).toEqual([
      expect.objectContaining({ id: question.id, isHidden: true }),
    ]);

    await actAs(question.id, "unhide", { bearer: ta.token });
    expect((await readJson<Questions>(await questionsAs(code, { cookie: guest.cookie }))).data.questions).toHaveLength(1);
  });

  it("guests cannot hide questions (403)", async () => {
    const { question, guest } = await setup();
    expect((await actAs(question.id, "hide", { cookie: guest.cookie })).status).toBe(403);
  });
});
