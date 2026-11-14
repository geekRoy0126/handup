// Where to send someone after they log in. Only same-site relative paths are allowed (no open redirects).
export const DEFAULT_NEXT = "/dashboard";

// Browsers treat "\" like "/" and strip tabs and newlines, so "/\evil.com" and "/\t/evil.com" both become
// "//evil.com", another site (#40). Anything with a backslash or a control character is rejected.
const UNSAFE = /[\\\u0000-\u001f\u007f]/;

export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || UNSAFE.test(next)) return DEFAULT_NEXT;
  return next;
}
