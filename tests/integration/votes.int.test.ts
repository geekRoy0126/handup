import { beforeEach, describe, expect, it } from "vitest";

import { POST as vote } from "@/app/api/v1/questions/[id]/vote/route";
import { GET as listQuestions } from "@/app/api/v1/sessions/[code]/questions/route";
import { db } from "@/lib/server/db";
import { getSessionVersion } from "@/lib/server/realtime";
import { findSessionByCode } from "@/lib/server/services/access";
import { askQuestion } from "@/lib/server/services/question-service";

import { createGuest, createLiveSession } from "./factories";
import { ctx, jsonRequest, readJson, resetDb, TEST_NOW } from "./helpers";

type VoteBody = { data: { voted: boolean; votes: number } };

beforeEach(resetDb);

async function setup() {
  const live = await createLiveSession();
  const session = await findSessionByCode(live.code);
  const author = await createGuest(live.code);
  const voter = await createGuest(live.code);
  const question = await askQuestion(session, author.guestId, { body: "What is RAG?", isAnonymous: true }, TEST_NOW);
  return { ...live, session, author, voter, question };
}

function voteAs(questionId: string, cookie: string) {
  return vote(jsonRequest(`/api/v1/questions/${questionId}/vote`, { method: "POST", cookie }), ctx({ id: questionId }));
}

describe("POST /api/v1/questions/[id]/vote", () => {
  it("adds a vote, and voting again removes it (toggle)", async () => {
    const { question, voter } = await setup();
    const first = await readJson<VoteBody>(await voteAs(question.id, voter.cookie));
    expect(first.data).toEqual({ voted: true, votes: 1 });
    const second = await readJson<VoteBody>(await voteAs(question.id, voter.cookie));
    expect(second.data).toEqual({ voted: false, votes: 0 });
  });

  it("rejects a vote on your own question with 403", async () => {
    const { question, author } = await setup();
    expect((await voteAs(question.id, author.cookie)).status).toBe(403);
  });

  it("rejects a guest from another session with 403", async () => {
    const { question } = await setup();
    const other = await createLiveSession();
    const outsider = await createGuest(other.code);
    expect((await voteAs(question.id, outsider.cookie)).status).toBe(403);
  });

  it("rejects votes on hidden and merged questions with 409", async () => {
    const { question, voter, session, author } = await setup();
    await db.question.update({ where: { id: question.id }, data: { isHidden: true } });
    expect((await voteAs(question.id, voter.cookie)).status).toBe(409);
    const target = await askQuestion(session, author.guestId, { body: "Another one", isAnonymous: true }, TEST_NOW);
    await db.question.update({ where: { id: question.id }, data: { isHidden: false, status: "MERGED", mergedIntoId: target.id } });
    expect((await voteAs(question.id, voter.cookie)).status).toBe(409);
  });

  it("answers 404 for an unknown question", async () => {
    const { voter } = await setup();
    expect((await voteAs("does-not-exist", voter.cookie)).status).toBe(404);
  });

  it("increments the session version so other screens refresh (PRD §4.7)", async () => {
    const { question, voter, session } = await setup();
    const before = await getSessionVersion(session.id);
    await voteAs(question.id, voter.cookie);
    expect(await getSessionVersion(session.id)).toBe(before + 1);
  });
});

describe("board ranking", () => {
  it("returns the most-voted open question first", async () => {
    const { code, session, author, voter, question } = await setup();
    const popular = await askQuestion(session, author.guestId, { body: "Popular one", isAnonymous: true }, TEST_NOW);
    await voteAs(popular.id, voter.cookie);
    const res = await listQuestions(jsonRequest(`/api/v1/sessions/${code}/questions`, { cookie: voter.cookie }), ctx({ code }));
    const { data } = await readJson<{ data: { questions: { id: string; votes: number; hasVoted: boolean }[] } }>(res);
    expect(data.questions.map((x) => x.id)).toEqual([popular.id, question.id]);
    expect(data.questions[0]).toMatchObject({ votes: 1, hasVoted: true });
  });
});

describe("session version", () => {
  it("increases when a question is asked", async () => {
    const { session, author } = await setup();
    const before = await getSessionVersion(session.id);
    await askQuestion(session, author.guestId, { body: "One more", isAnonymous: true }, TEST_NOW);
    expect(await getSessionVersion(session.id)).toBe(before + 1);
  });
});
