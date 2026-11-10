import "server-only";

// Cookie names and helpers shared by every route handler that signs someone in or out.
export const USER_COOKIE = "hu_session";
export const GUEST_COOKIE = "hu_guest";

export const USER_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
export const GUEST_COOKIE_MAX_AGE = 24 * 60 * 60;

function serializeCookie(name: string, value: string, maxAgeSeconds: number): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSeconds}`];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function setCookie(res: Response, name: string, value: string, maxAgeSeconds: number): Response {
  res.headers.append("Set-Cookie", serializeCookie(name, value, maxAgeSeconds));
  return res;
}

export function clearCookie(res: Response, name: string): Response {
  return setCookie(res, name, "", 0);
}

/** Reads one cookie from a request's Cookie header. */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
