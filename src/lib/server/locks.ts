import "server-only";

import { Prisma } from "@/generated/prisma/client";

/**
 * Locks question rows until the transaction ends (SELECT … FOR UPDATE, in id order so two transactions never
 * deadlock). A vote and a merge on the same question then run one after the other, so a vote cast while a
 * question is being merged is never lost (#9).
 */
export async function lockQuestions(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
  const sorted = [...new Set(ids)].sort();
  await tx.$queryRaw`SELECT id FROM "Question" WHERE id IN (${Prisma.join(sorted)}) ORDER BY id FOR UPDATE`;
}

/**
 * Serializes staff writes that enforce a per-session "only one" rule (one pinned question, one open poll) with a
 * transaction-scoped advisory lock (#59). Unlike locking the Session row, this takes no row lock, so it can't
 * deadlock with votes, which lock a question row and then update the Session row. Released at commit/rollback.
 */
export async function lockSessionForStaffWrite(tx: Prisma.TransactionClient, sessionId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${sessionId}, 0))) AS l`;
}
