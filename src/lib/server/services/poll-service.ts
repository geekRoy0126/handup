import "server-only";

import { ApiError } from "@/lib/api/http";
import { CONFIDENCE_OPTIONS, computePollResults, type PollResults } from "@/lib/domain/poll-results";
import { db } from "@/lib/server/db";
import { lockSessionForStaffWrite } from "@/lib/server/locks";
import { bumpSessionVersion } from "@/lib/server/realtime";
import type { CreatePoll } from "@/lib/validation/poll";

import type { SessionRow } from "./access";

export type PollView = {
  id: string;
  kind: "MULTIPLE_CHOICE" | "CONFIDENCE";
  prompt: string;
  status: "OPEN" | "CLOSED";
  createdAt: Date;
  closedAt: Date | null;
  options: { id: string; label: string }[];
  /** The viewing guest's answer (null for staff or if not answered). */
  myOptionId: string | null;
  /** Staff always see results; guests after answering or once the poll is closed (PRD §4.4). */
  results: PollResults | null;
};

export type PollViewer = { role: "GUEST"; guestId: string } | { role: "STAFF" };

const pollInclude = {
  options: { orderBy: { position: "asc" } },
  responses: { select: { guestId: true, optionId: true } },
} as const;

type PollRow = NonNullable<Awaited<ReturnType<typeof findPollRow>>>;

function findPollRow(id: string) {
  return db.poll.findUnique({ where: { id }, include: pollInclude });
}

function toView(poll: PollRow, viewer: PollViewer): PollView {
  const myOptionId =
    viewer.role === "GUEST" ? (poll.responses.find((r) => r.guestId === viewer.guestId)?.optionId ?? null) : null;
  const canSeeResults = viewer.role === "STAFF" || myOptionId !== null || poll.status === "CLOSED";
  return {
    id: poll.id,
    kind: poll.kind,
    prompt: poll.prompt,
    status: poll.status,
    createdAt: poll.createdAt,
    closedAt: poll.closedAt,
    options: poll.options.map((o) => ({ id: o.id, label: o.label })),
    myOptionId,
    results: canSeeResults ? computePollResults(poll.options, poll.responses) : null,
  };
}

/** All polls of the session, newest first. */
export async function listPolls(session: SessionRow, viewer: PollViewer): Promise<PollView[]> {
  const polls = await db.poll.findMany({ where: { sessionId: session.id }, include: pollInclude, orderBy: { createdAt: "desc" } });
  return polls.map((p) => toView(p, viewer));
}

export async function createPoll(session: SessionRow, input: CreatePoll, now: Date): Promise<PollView> {
  if (session.status === "ENDED") throw new ApiError("CONFLICT", "This session has ended.");
  const labels = input.kind === "CONFIDENCE" ? [...CONFIDENCE_OPTIONS] : input.options;
  const created = await db.$transaction(async (tx) => {
    // Two launches at once must not both count 0 open polls (#59).
    await lockSessionForStaffWrite(tx, session.id);
    const { status: sessionStatus } = await tx.session.findUniqueOrThrow({ where: { id: session.id }, select: { status: true } });
    if (sessionStatus === "ENDED") throw new ApiError("CONFLICT", "This session has ended.");
    const open = await tx.poll.count({ where: { sessionId: session.id, status: "OPEN" } });
    if (open > 0) throw new ApiError("CONFLICT", "Close the current poll first.");
    const poll = await tx.poll.create({
      data: {
        sessionId: session.id,
        kind: input.kind,
        prompt: input.prompt,
        createdAt: now,
        options: { create: labels.map((label, position) => ({ label, position })) },
      },
      select: { id: true },
    });
    await bumpSessionVersion(tx, session.id);
    return poll;
  });
  return getPollView(created.id, { role: "STAFF" });
}

async function getPollView(pollId: string, viewer: PollViewer): Promise<PollView> {
  const poll = await findPollRow(pollId);
  if (!poll) throw new ApiError("NOT_FOUND", "No such poll.");
  return toView(poll, viewer);
}

/** Finds a poll and its session, or 404. */
export async function findPollWithSession(pollId: string) {
  const poll = await db.poll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      status: true,
      options: { select: { id: true } },
      session: { select: { id: true, code: true, title: true, status: true, hostId: true } },
    },
  });
  if (!poll) throw new ApiError("NOT_FOUND", "No such poll.");
  return poll;
}

type PollRef = Awaited<ReturnType<typeof findPollWithSession>>;

/** One response per guest; answering again replaces it while the poll is open. */
export async function respondToPoll(poll: PollRef, guestId: string, optionId: string): Promise<PollView> {
  if (poll.status === "CLOSED") throw new ApiError("CONFLICT", "This poll is closed.");
  if (!poll.options.some((o) => o.id === optionId)) throw new ApiError("VALIDATION_FAILED", "optionId: not an option of this poll");
  await db.$transaction(async (tx) => {
    // Re-read under the poll's row lock: closing the poll (or ending the session, which closes it) updates this
    // row, so an answer can't land after the poll closed (#60).
    const [current] = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM "Poll" WHERE id = ${poll.id} FOR UPDATE`;
    if (current?.status !== "OPEN") throw new ApiError("CONFLICT", "This poll is closed.");
    await tx.pollResponse.upsert({
      where: { pollId_guestId: { pollId: poll.id, guestId } },
      create: { pollId: poll.id, guestId, optionId },
      update: { optionId },
    });
    await bumpSessionVersion(tx, poll.session.id);
  });
  return getPollView(poll.id, { role: "GUEST", guestId });
}

export async function closePoll(poll: PollRef, now: Date): Promise<PollView> {
  if (poll.status === "OPEN") {
    await db.$transaction(async (tx) => {
      await tx.poll.update({ where: { id: poll.id }, data: { status: "CLOSED", closedAt: now } });
      await bumpSessionVersion(tx, poll.session.id);
    });
  }
  return getPollView(poll.id, { role: "STAFF" });
}
