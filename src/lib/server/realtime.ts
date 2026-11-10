import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/server/db";

// Real time (docs/PRD.md §4.7): writes bump Session.version; the SSE route polls it and tells clients to refetch.
type Tx = Prisma.TransactionClient;

/** Call inside the same transaction as the write that others must see. */
export async function bumpSessionVersion(tx: Tx, sessionId: string): Promise<void> {
  await tx.session.update({ where: { id: sessionId }, data: { version: { increment: 1 } } });
}

export async function getSessionVersion(sessionId: string): Promise<number> {
  const session = await db.session.findUnique({ where: { id: sessionId }, select: { version: true } });
  return session?.version ?? 0;
}
