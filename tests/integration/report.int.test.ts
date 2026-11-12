import { beforeEach, describe, expect, it } from "vitest";

import { POST as invite } from "@/app/api/v1/sessions/[code]/moderators/route";
import { GET as getReport } from "@/app/api/v1/sessions/[code]/report/route";
import { findSessionByCode } from "@/lib/server/services/access";
import { createPoll } from "@/lib/server/services/poll-service";
import { askQuestion } from "@/lib/server/services/question-service";

import { createGuest, createLiveSession, createUser } from "./factories";
import { ctx, jsonRequest, readJson, resetDb, TEST_NOW } from "./helpers";

type Report = {
  totals: { guests: number; questions: number; votes: number };
  topQuestions: { body: string }[];
  unanswered: { body: string }[];
  polls: { prompt: string; results: { total: number } }[];
};

beforeEach(resetDb);

function reportAs(code: string, auth: { bearer?: string; cookie?: string }) {
  return getReport(jsonRequest(`/api/v1/sessions/${code}/report`, auth), ctx({ code }));
}

describe("GET /api/v1/sessions/[code]/report (PRD US9)", () => {
  it("gives the host totals, questions and polls", async () => {
    const { code, hostToken } = await createLiveSession();
    const session = await findSessionByCode(code);
    const guest = await createGuest(code);
    await askQuestion(session, guest.guestId, { body: "Will this be recorded?", isAnonymous: true }, TEST_NOW);
    await createPoll(session, { kind: "CONFIDENCE", prompt: "How clear was that?" }, TEST_NOW);

    const res = await reportAs(code, { bearer: hostToken });
    expect(res.status).toBe(200);
    const { data } = await readJson<{ data: { report: Report } }>(res);
    expect(data.report.totals).toEqual({ guests: 1, questions: 1, votes: 0 });
    expect(data.report.topQuestions.map((q) => q.body)).toEqual(["Will this be recorded?"]);
    expect(data.report.unanswered).toHaveLength(1);
    expect(data.report.polls[0]).toMatchObject({ prompt: "How clear was that?", results: { total: 0 } });
  });

  it("is available to moderators", async () => {
    const { code, hostToken } = await createLiveSession();
    const ta = await createUser("TA");
    await invite(jsonRequest(`/api/v1/sessions/${code}/moderators`, { bearer: hostToken, body: { email: ta.user.email } }), ctx({ code }));
    expect((await reportAs(code, { bearer: ta.token })).status).toBe(200);
  });

  it("answers 403 to guests", async () => {
    const { code } = await createLiveSession();
    const guest = await createGuest(code);
    expect((await reportAs(code, { cookie: guest.cookie })).status).toBe(403);
  });
});
