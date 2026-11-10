// Test data builders that go through the real services, so tests exercise the same code paths as the app.
import { registerUser } from "@/lib/server/services/auth-service";
import { createSession } from "@/lib/server/services/session-service";

import { TEST_NOW } from "./helpers";

let counter = 0;

export async function createUser(name = "Host") {
  counter += 1;
  return registerUser({ name, email: `user${counter}-${Date.now()}@example.com`, password: "password123" }, TEST_NOW);
}

/** A host plus one LIVE session. */
export async function createLiveSession(title = "CS6983 Lecture 9") {
  const host = await createUser();
  const session = await createSession({ hostId: host.user.id, title }, TEST_NOW);
  return { code: session.code, host, hostToken: host.token };
}
