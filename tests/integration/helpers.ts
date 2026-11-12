// Shared helpers for integration tests: a clean database per test and small Request/Response utilities.
import { db } from "@/lib/server/db";

export const TEST_NOW = new Date("2026-11-12T15:00:00Z");

export async function resetDb(): Promise<void> {
  await db.$executeRaw`TRUNCATE TABLE "PollResponse", "PollOption", "Poll", "Vote", "Question", "Guest",
    "SessionModerator", "Session", "ApiKey", "User" CASCADE`;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  cookie?: string;
  bearer?: string;
  headers?: Record<string, string>;
};

export function jsonRequest(path: string, options: RequestOptions = {}): Request {
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.cookie) headers.cookie = options.cookie;
  if (options.bearer) headers.authorization = `Bearer ${options.bearer}`;
  return new Request(`http://localhost${path}`, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

/** The full Set-Cookie header for `name`, if the response sets it. */
export function getSetCookie(res: Response, name: string): string | undefined {
  return res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
}

/** "name=value" pair from a Set-Cookie header, ready to send back as a Cookie header. */
export function cookiePair(setCookie: string | undefined): string {
  if (!setCookie) throw new Error("expected a Set-Cookie header");
  return setCookie.split(";")[0] ?? "";
}

/** Route context for dynamic route handlers, e.g. ctx({ code: "K7Q2XM" }). */
export function ctx<P extends Record<string, string>>(params: P): { params: Promise<P> } {
  return { params: Promise.resolve(params) };
}

export async function readJson<T = { data?: unknown; error?: { code: string; message: string } }>(
  res: Response,
): Promise<T> {
  return (await res.json()) as T;
}
