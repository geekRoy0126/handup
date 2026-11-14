import { beforeEach, describe, expect, it } from "vitest";

import { POST as closePoll } from "@/app/api/v1/polls/[id]/close/route";
import { POST as respond } from "@/app/api/v1/polls/[id]/responses/route";
import { POST as invite } from "@/app/api/v1/sessions/[code]/moderators/route";
import { GET as listPolls, POST as createPoll } from "@/app/api/v1/sessions/[code]/polls/route";
import { getSessionVersion } from "@/lib/server/realtime";
import { findSessionByCode } from "@/lib/server/services/access";

import { createGuest, createLiveSession, createUser } from "./factories";
import { ctx, jsonRequest, readJson, resetDb } from "./helpers";

type PollOption = { id: string; label: string };
type ResultOption = { optionId: string; count: number; percent: number };
type PollView = {
  id: string;
  status: string;
  options: PollOption[];
  myOptionId: string | null;
  results: { total: number; options: ResultOption[] } | null;
};

beforeEach(resetDb);

const mcPoll = { kind: "MULTIPLE_CHOICE", prompt: "Which topic next?", options: ["RAG", "Agents", "Evals"] };

function create(code: string, token: string, body: unknown = mcPoll) {
  return createPoll(jsonRequest(`/api/v1/sessions/${code}/polls`, { bearer: token, body }), ctx({ code }));
}

async function createOk(code: string, token: string, body: unknown = mcPoll): Promise<PollView> {
  return (await readJson<{ data: { poll: PollView } }>(await create(code, token, body))).data.poll;
}

function answer(pollId: string, cookie: string, optionId: string) {
  return respond(jsonRequest(`/api/v1/polls/${pollId}/responses`, { cookie, body: { optionId } }), ctx({ id: pollId }));
}

async function pollsAs(code: string, auth: { cookie?: string; bearer?: string }): Promise<PollView[]> {
  const res = await listPolls(jsonRequest(`/api/v1/sessions/${code}/polls`, auth), ctx({ code }));
  return (await readJson<{ data: { polls: PollView[] } }>(res)).data.polls;
}

function close(pollId: string, token: string) {
  return closePoll(jsonRequest(`/api/v1/polls/${pollId}/close`, { method: "POST", bearer: token }), ctx({ id: pollId }));
}

describe("launching polls (PRD US8)", () => {
  it("creates an open multiple-choice poll with options in the order entered", async () => {
    const { code, hostToken } = await createLiveSession();
    const res = await create(code, hostToken);
    expect(res.status).toBe(201);
    const { data } = await readJson<{ data: { poll: PollView } }>(res);
    expect(data.poll.status).toBe("OPEN");
    expect(data.poll.options.map((o) => o.label)).toEqual(["RAG", "Agents", "Evals"]);
  });

  it("gives a confidence poll the fixed 1–5 options", async () => {
    const { code, hostToken } = await createLiveSession();
    const poll = await createOk(code, hostToken, { kind: "CONFIDENCE", prompt: "How clear was that?" });
    expect(poll.options.map((o) => o.label)).toEqual(["1 – Lost", "2", "3 – Getting there", "4", "5 – Got it"]);
  });

  it("refuses a second open poll with 'Close the current poll first.'", async () => {
    const { code, hostToken } = await createLiveSession();
    await create(code, hostToken);
    const res = await create(code, hostToken);
    expect(res.status).toBe(409);
    expect((await readJson(res)).error?.message).toBe("Close the current poll first.");
  });

  it("does not let moderators launch polls (403)", async () => {
    const { code, hostToken } = await createLiveSession();
    const ta = await createUser("TA");
    await invite(jsonRequest(`/api/v1/sessions/${code}/moderators`, { bearer: hostToken, body: { email: ta.user.email } }), ctx({ code }));
    expect((await create(code, ta.token)).status).toBe(403);
  });

  it("bumps the session version so guests get the poll live", async () => {
    const { code, hostToken } = await createLiveSession();
    const session = await findSessionByCode(code);
    const before = await getSessionVersion(session.id);
    await create(code, hostToken);
    expect(await getSessionVersion(session.id)).toBe(before + 1);
  });
});

describe("one open poll under concurrency (#59)", () => {
  it("opens one poll when Launch is clicked twice at once; the other answers 409", async () => {
    for (let round = 0; round < 5; round += 1) {
      await resetDb();
      const { code, hostToken } = await createLiveSession();
      const responses = await Promise.all([create(code, hostToken), create(code, hostToken)]);
      expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
      expect((await pollsAs(code, { bearer: hostToken })).filter((p) => p.status === "OPEN")).toHaveLength(1);
    }
  });
});

describe("answering polls", () => {
  it("hides results from a guest until they answer, then shows them", async () => {
    const { code, hostToken } = await createLiveSession();
    const poll = await createOk(code, hostToken);
    const guest = await createGuest(code);
    expect((await pollsAs(code, { cookie: guest.cookie }))[0]?.results).toBeNull();
    expect((await answer(poll.id, guest.cookie, poll.options[1]?.id ?? "")).status).toBe(200);
    const [after] = await pollsAs(code, { cookie: guest.cookie });
    expect(after?.myOptionId).toBe(poll.options[1]?.id);
    expect(after?.results?.total).toBe(1);
  });

  it("keeps one response per guest; answering again replaces it", async () => {
    const { code, hostToken } = await createLiveSession();
    const poll = await createOk(code, hostToken);
    const guest = await createGuest(code);
    await answer(poll.id, guest.cookie, poll.options[0]?.id ?? "");
    await answer(poll.id, guest.cookie, poll.options[2]?.id ?? "");
    const [hostView] = await pollsAs(code, { bearer: hostToken });
    expect(hostView?.results?.total).toBe(1);
    expect(hostView?.results?.options.map((o) => o.count)).toEqual([0, 0, 1]);
  });

  it("rejects an option from another poll (422)", async () => {
    const { code, hostToken } = await createLiveSession();
    const poll = await createOk(code, hostToken);
    const guest = await createGuest(code);
    expect((await answer(poll.id, guest.cookie, "not-an-option")).status).toBe(422);
  });

  it("closing a poll keeps final results and rejects new answers (409)", async () => {
    const { code, hostToken } = await createLiveSession();
    const poll = await createOk(code, hostToken);
    const guest = await createGuest(code);
    await answer(poll.id, guest.cookie, poll.options[0]?.id ?? "");
    expect((await close(poll.id, hostToken)).status).toBe(200);
    expect((await answer(poll.id, guest.cookie, poll.options[1]?.id ?? "")).status).toBe(409);
    const late = await createGuest(code);
    const [closed] = await pollsAs(code, { cookie: late.cookie });
    expect(closed?.status).toBe("CLOSED");
    expect(closed?.results?.options[0]).toMatchObject({ count: 1, percent: 100 });
  });

  it("lets the host launch a new poll after closing the previous one", async () => {
    const { code, hostToken } = await createLiveSession();
    const poll = await createOk(code, hostToken);
    await close(poll.id, hostToken);
    expect((await create(code, hostToken)).status).toBe(201);
  });

  it("answers 403 when a guest tries to close a poll", async () => {
    const { code, hostToken } = await createLiveSession();
    const poll = await createOk(code, hostToken);
    const guest = await createGuest(code);
    const res = await closePoll(jsonRequest(`/api/v1/polls/${poll.id}/close`, { method: "POST", cookie: guest.cookie }), ctx({ id: poll.id }));
    expect(res.status).toBe(403);
  });
});
