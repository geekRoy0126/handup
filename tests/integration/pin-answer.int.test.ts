import { beforeEach, describe, expect, it } from "vitest";

import { PATCH as act } from "@/app/api/v1/questions/[id]/route";
import { POST as vote } from "@/app/api/v1/questions/[id]/vote/route";
import { db } from "@/lib/server/db";
import { getSessionVersion } from "@/lib/server/realtime";
import { findSessionByCode } from "@/lib/server/services/access";
import { askQuestion } from "@/lib/server/services/question-service";

import { createGuest, createLiveSession, createUser } from "./factories";
import { ctx, jsonRequest, resetDb, TEST_NOW } from "./helpers";

beforeEach(resetDb);

async function setup() {
  const live = await createLiveSession();
  const session = await findSessionByCode(live.code);
  const guest = await createGuest(live.code);
  const ask = (body: string) => askQuestion(session, guest.guestId, { body, isAnonymous: true }, TEST_NOW);
  return { ...live, session, guest, first: await ask("First question"), second: await ask("Second question") };
}

function actAs(questionId: string, action: string, auth: { bearer?: string; cookie?: string }) {
  return act(jsonRequest(`/api/v1/questions/${questionId}`, { method: "PATCH", body: { action }, ...auth }), ctx({ id: questionId }));
}

const row = (id: string) => db.question.findUniqueOrThrow({ where: { id } });

describe("PATCH /api/v1/questions/[id] — pin and answer (PRD US5)", () => {
  it("pins a question, and pinning another one unpins the first", async () => {
    const { first, second, hostToken } = await setup();
    expect((await actAs(first.id, "pin", { bearer: hostToken })).status).toBe(200);
    expect((await row(first.id)).isPinned).toBe(true);
    await actAs(second.id, "pin", { bearer: hostToken });
    expect((await row(first.id)).isPinned).toBe(false);
    expect((await row(second.id)).isPinned).toBe(true);
  });

  it("marking answered sets ANSWERED and answeredAt and unpins it; reopen undoes it", async () => {
    const { first, hostToken } = await setup();
    await actAs(first.id, "pin", { bearer: hostToken });
    await actAs(first.id, "answer", { bearer: hostToken });
    const answered = await row(first.id);
    expect(answered).toMatchObject({ status: "ANSWERED", isPinned: false });
    expect(answered.answeredAt).toBeInstanceOf(Date);
    await actAs(first.id, "reopen", { bearer: hostToken });
    expect(await row(first.id)).toMatchObject({ status: "OPEN", answeredAt: null });
  });

  it("bumps the session version so guests see it live", async () => {
    const { first, hostToken, session } = await setup();
    const before = await getSessionVersion(session.id);
    await actAs(first.id, "pin", { bearer: hostToken });
    expect(await getSessionVersion(session.id)).toBe(before + 1);
  });

  it("answers 403 to guests and to users who are not staff of this session", async () => {
    const { first, guest } = await setup();
    const stranger = await createUser("Stranger");
    expect((await actAs(first.id, "pin", { cookie: guest.cookie })).status).toBe(403);
    expect((await actAs(first.id, "pin", { bearer: stranger.token })).status).toBe(403);
  });

  it("answers 401 without any token", async () => {
    const { first } = await setup();
    expect((await actAs(first.id, "pin", {})).status).toBe(401);
  });

  it("answers 409 when pinning an answered question and 422 for an unknown action", async () => {
    const { first, hostToken } = await setup();
    await actAs(first.id, "answer", { bearer: hostToken });
    expect((await actAs(first.id, "pin", { bearer: hostToken })).status).toBe(409);
    expect((await actAs(first.id, "explode", { bearer: hostToken })).status).toBe(422);
  });

  it("leaves exactly one pinned question when two staff pin different questions at once (#59)", async () => {
    for (let round = 0; round < 5; round += 1) {
      await resetDb();
      const { first, second, hostToken } = await setup();
      const responses = await Promise.all([
        actAs(first.id, "pin", { bearer: hostToken }),
        actAs(second.id, "pin", { bearer: hostToken }),
      ]);
      expect(responses.map((r) => r.status)).toEqual([200, 200]);
      expect(await db.question.count({ where: { id: { in: [first.id, second.id] }, isPinned: true } })).toBe(1);
    }
  });

  it("never answers 500 when a pin and votes on other questions run at the same moment (#59)", async () => {
    for (let round = 0; round < 10; round += 1) {
      await resetDb();
      const { first, second, hostToken, session } = await setup();
      const voter = await createGuest(session.code);
      const voteOn = (id: string) =>
        vote(jsonRequest(`/api/v1/questions/${id}/vote`, { method: "POST", cookie: voter.cookie }), ctx({ id }));
      await actAs(second.id, "pin", { bearer: hostToken });
      // Pinning `first` unpins `second` while votes lock `second` and then the session row.
      const statuses = (
        await Promise.all([actAs(first.id, "pin", { bearer: hostToken }), voteOn(second.id), voteOn(first.id)])
      ).map((r) => r.status);
      expect(statuses).toEqual([200, 200, 200]);
    }
  });

  it("never ends ANSWERED and pinned when answer and pin race on one question (#59)", async () => {
    for (let round = 0; round < 5; round += 1) {
      await resetDb();
      const { first, hostToken } = await setup();
      await Promise.all([actAs(first.id, "answer", { bearer: hostToken }), actAs(first.id, "pin", { bearer: hostToken })]);
      const after = await row(first.id);
      expect(after.status === "ANSWERED" && after.isPinned).toBe(false);
    }
  });
});
