// Where to send someone after they log in. Only same-site relative paths are allowed (no open redirects).
export const DEFAULT_NEXT = "/dashboard";

export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : DEFAULT_NEXT;
}
