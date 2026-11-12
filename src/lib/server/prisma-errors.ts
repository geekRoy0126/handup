import "server-only";

import { Prisma } from "@/generated/prisma/client";

/** True when a write failed on a unique constraint (Prisma P2002), e.g. a concurrent insert won the race. */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
