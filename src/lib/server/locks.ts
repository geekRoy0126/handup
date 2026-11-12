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
