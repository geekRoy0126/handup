import { beforeEach, describe, expect, it } from "vitest";

import { POST as merge } from "@/app/api/v1/questions/[id]/merge/route";
import { POST as vote } from "@/app/api/v1/questions/[id]/vote/route";
import { GET as listQuestions } from "@/app/api/v1/sessions/[code]/questions/route";
import { db } from "@/lib/server/db";
import { getSessionVersion } from "@/lib/server/realtime";
import { findSessionByCode } from "@/lib/server/services/access";
import { askQuestion } from "@/lib/server/services/question-service";

import { createGuest, createLiveSession } from "./factories";
import { ctx, jsonRequest, readJson, resetDb, TEST_NOW } from "./helpers";

type Board = { data: { questions: { id: string; votes: number; mergedCount: number }[] } };

beforeEach(resetDb);

async function setup() {
  const live = await createLiveSession();
  const session = await findSessionByCode(live.code);
  const [alice, bob, carol] = [await createGuest(live.code), await createGuest(live.code), await createGuest(live.code)];
  const ask = (guestId: string, body: string) => askQuestion(session, guestId, { body, isAnonymous: true }, TEST_NOW);
  const target = await ask(alice.guestId, "When is the midterm?");
  const source = await ask(alice.guestId, "What date is the midterm exam?");
  return { ...live, session, alice, bob, carol, target, source };
}

function voteAs(id: string, cookie: string) {
  return vote(jsonRequest(`/api/v1/questions/${id}/vote`, { method: "POST", cookie }), ctx({ id }));
}

function mergeAs(id: string, targetId: string, auth: { bearer?: string; cookie?: string }) {
  return merge(jsonRequest(`/api/v1/questions/${id}/merge`, { body: { targetId }, ...auth }), ctx({ id }));
}

async function board(code: string, cookie: string) {
  return readJson<Board>(await listQuestions(jsonRequest(`/api/v1/sessions/${code}/questions`, { cookie }), ctx({ code })));
}

describe("POST /api/v1/questions/[id]/merge (PRD US7)", () => {
  it("moves votes to the target without counting a guest twice, and removes the source from the board", async () => {
    const { code, hostToken, bob, carol, target, source } = await setup();
    await voteAs(source.id, bob.cookie);
    await voteAs(source.id, carol.cookie);
    await voteAs(target.id, carol.cookie); // Carol voted for both.

    expect((await mergeAs(source.id, target.id, { bearer: hostToken })).status).toBe(200);

    const { data } = await board(code, bob.cookie);
    expect(data.questions).toEqual([expect.objectContaining({ id: target.id, votes: 2, mergedCount: 1 })]);
    expect(await db.question.findUniqueOrThrow({ where: { id: source.id } })).toMatchObject({
      status: "MERGED",
      mergedIntoId: target.id,
      isPinned: false,
    });
  });

  it("bumps the session version", async () => {
    const { hostToken, target, source, session } = await setup();
    const before = await getSessionVersion(session.id);
    await mergeAs(source.id, target.id, { bearer: hostToken });
    expect(await getSessionVersion(session.id)).toBe(before + 1);
  });

  it("refuses to merge a question into itself or into an already merged one (409)", async () => {
    const { hostToken, target, source, session, bob } = await setup();
    expect((await mergeAs(source.id, source.id, { bearer: hostToken })).status).toBe(409);
    const third = await askQuestion(session, bob.guestId, { body: "Midterm when?", isAnonymous: true }, TEST_NOW);
    await mergeAs(source.id, target.id, { bearer: hostToken });
    expect((await mergeAs(third.id, source.id, { bearer: hostToken })).status).toBe(409);
    expect((await mergeAs(source.id, third.id, { bearer: hostToken })).status).toBe(409);
  });

  it("refuses a target from another session (404)", async () => {
    const { hostToken, source } = await setup();
    const other = await setup();
    expect((await mergeAs(source.id, other.target.id, { bearer: hostToken })).status).toBe(404);
  });

  it("answers 403 to guests", async () => {
    const { bob, target, source } = await setup();
    expect((await mergeAs(source.id, target.id, { cookie: bob.cookie })).status).toBe(403);
  });
});

describe("a vote cast while the question is being merged (found by E2E, #9)", () => {
  it("is either moved to the target or refused, never silently lost", async () => {
    for (let round = 0; round < 5; round += 1) {
      await resetDb();
      const { hostToken, bob, target, source } = await setup();
      const [voteRes, mergeRes] = await Promise.all([
        voteAs(source.id, bob.cookie),
        mergeAs(source.id, target.id, { bearer: hostToken }),
      ]);
      expect(mergeRes.status).toBe(200);
      const bobVotedTarget = await db.vote.count({ where: { questionId: target.id, guestId: bob.guestId } });
      if (voteRes.status === 200) expect(bobVotedTarget).toBe(1);
      else expect(voteRes.status).toBe(409);
    }
  });
});
