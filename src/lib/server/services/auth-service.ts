import "server-only";

import { ApiError } from "@/lib/api/http";
import { hashPassword, verifyPassword } from "@/lib/server/auth/password";
import { signUserToken } from "@/lib/server/auth/token";
import { db } from "@/lib/server/db";
import { isUniqueViolation } from "@/lib/server/prisma-errors";
import type { Login, Register } from "@/lib/validation/auth";

export type UserDto = { id: string; name: string; email: string };
export type AuthResult = { user: UserDto; token: string };

const userSelect = { id: true, name: true, email: true } as const;
const LOGIN_FAILED = "Email or password is incorrect.";
const EMAIL_TAKEN = "An account with this email already exists.";

// Compared against when the email has no account, so a failed login always costs one bcrypt run (#42).
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("handup-dummy-password-for-timing");
  return dummyHash;
}

export async function registerUser(input: Register, now: Date): Promise<AuthResult> {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new ApiError("CONFLICT", EMAIL_TAKEN);
  try {
    const user = await db.user.create({
      data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) },
      select: userSelect,
    });
    return { user, token: await signUserToken(user.id, now) };
  } catch (err) {
    // A concurrent registration with the same email won the race between the check above and this insert (#42).
    if (isUniqueViolation(err)) throw new ApiError("CONFLICT", EMAIL_TAKEN);
    throw err;
  }
}

export async function loginUser(input: Login, now: Date): Promise<AuthResult> {
  const found = await db.user.findUnique({ where: { email: input.email } });
  // Same message and the same bcrypt cost for unknown email and wrong password, so accounts cannot be discovered.
  const isValid = await verifyPassword(input.password, found?.passwordHash ?? (await getDummyHash()));
  if (!found || !isValid) throw new ApiError("UNAUTHENTICATED", LOGIN_FAILED);
  const user = { id: found.id, name: found.name, email: found.email };
  return { user, token: await signUserToken(user.id, now) };
}

export async function getUser(userId: string): Promise<UserDto> {
  const user = await db.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!user) throw new ApiError("UNAUTHENTICATED", "Please log in.");
  return user;
}
