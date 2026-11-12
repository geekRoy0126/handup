// Test data builders that go through the real services, so tests exercise the same code paths as the app.
// Tokens are signed with the real clock because route handlers verify them with the real clock (AGENTS.md §1.6).
import { findSessionByCode } from "@/lib/server/services/access";
import { registerUser } from "@/lib/server/services/auth-service";
import { joinSession } from "@/lib/server/services/guest-service";
import { createSession } from "@/lib/server/services/session-service";

import { TEST_NOW } from "./helpers";

let counter = 0;

export async function createUser(name = "Host") {
  counter += 1;
  return registerUser({ name, email: `user${counter}-${Date.now()}@example.com`, password: "password123" }, new Date());
}

/** A host plus one LIVE session. */
export async function createLiveSession(title = "CS6983 Lecture 9") {
  const host = await createUser();
  const session = await createSession({ hostId: host.user.id, title }, TEST_NOW);
  return { code: session.code, host, hostToken: host.token };
}

/** Joins a session as a new guest; `cookie` is ready to send as a Cookie header. */
export async function createGuest(code: string) {
  const session = await findSessionByCode(code);
  const { guest, token } = await joinSession(session, null, new Date());
  return { guestId: guest.id, token, cookie: `hu_guest=${token}` };
}
