import "server-only";

import { ApiError } from "@/lib/api/http";
import { hashPassword, verifyPassword } from "@/lib/server/auth/password";
import { signUserToken } from "@/lib/server/auth/token";
import { db } from "@/lib/server/db";
import type { Login, Register } from "@/lib/validation/auth";

export type UserDto = { id: string; name: string; email: string };
export type AuthResult = { user: UserDto; token: string };

const userSelect = { id: true, name: true, email: true } as const;
const LOGIN_FAILED = "Email or password is incorrect.";

export async function registerUser(input: Register, now: Date): Promise<AuthResult> {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new ApiError("CONFLICT", "An account with this email already exists.");
  const user = await db.user.create({
    data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) },
    select: userSelect,
  });
  return { user, token: await signUserToken(user.id, now) };
}

export async function loginUser(input: Login, now: Date): Promise<AuthResult> {
  const found = await db.user.findUnique({ where: { email: input.email } });
  // Same message for unknown email and wrong password, so accounts cannot be discovered.
  if (!found || !(await verifyPassword(input.password, found.passwordHash))) {
    throw new ApiError("UNAUTHENTICATED", LOGIN_FAILED);
  }
  const user = { id: found.id, name: found.name, email: found.email };
  return { user, token: await signUserToken(user.id, now) };
}

export async function getUser(userId: string): Promise<UserDto> {
  const user = await db.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!user) throw new ApiError("UNAUTHENTICATED", "Please log in.");
  return user;
}
