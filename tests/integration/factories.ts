// Test data builders that go through the real services, so tests exercise the same code paths as the app.
import { registerUser } from "@/lib/server/services/auth-service";

import { TEST_NOW } from "./helpers";

let counter = 0;

export async function createUser(name = "Host") {
  counter += 1;
  return registerUser({ name, email: `user${counter}-${Date.now()}@example.com`, password: "password123" }, TEST_NOW);
}
