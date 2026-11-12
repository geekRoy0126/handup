import "server-only";

import { ApiError } from "@/lib/api/http";
import { normalizeJoinCode } from "@/lib/domain/join-code";
import { getGuestClaims, getUserId } from "@/lib/server/auth/request-auth";
import { db } from "@/lib/server/db";

// Who is looking at a session, decided once per request (docs/PRD.md §3).
export type StaffRole = "HOST" | "MODERATOR";
export type ViewerRole = StaffRole | "GUEST";
export type Viewer =
  | { role: StaffRole; userId: string }
  | { role: "GUEST"; guestId: string }
  | { role: null };

export type SessionRow = { id: string; code: string; title: string; status: "LIVE" | "ENDED"; hostId: string };

const sessionSelect = { id: true, code: true, title: true, status: true, hostId: true } as const;

export async function findSessionByCode(rawCode: string): Promise<SessionRow> {
  const code = normalizeJoinCode(rawCode);
  const session = code ? await db.session.findUnique({ where: { code }, select: sessionSelect }) : null;
  if (!session) throw new ApiError("NOT_FOUND", "No session with that code.");
  return session;
}

export async function getStaffRole(session: SessionRow, userId: string): Promise<StaffRole | null> {
  if (session.hostId === userId) return "HOST";
  const moderator = await db.sessionModerator.findUnique({
    where: { sessionId_userId: { sessionId: session.id, userId } },
    select: { userId: true },
  });
  return moderator ? "MODERATOR" : null;
}

/** Staff (host/moderator) win over a guest cookie, so a host testing their own board still sees staff tools. */
export async function getViewer(req: Request, session: SessionRow, now: Date): Promise<Viewer> {
  const userId = await getUserId(req, now);
  if (userId) {
    const role = await getStaffRole(session, userId);
    if (role) return { role, userId };
  }
  const guest = await getGuestClaims(req, now);
  if (guest && guest.sessionId === session.id) return { role: "GUEST", guestId: guest.guestId };
  return { role: null };
}

async function denied(req: Request, now: Date, message: string): Promise<never> {
  // Someone signed in (as a user or as a guest) but without the right role gets 403; nobody at all gets 401.
  const isSignedIn = (await getUserId(req, now)) !== null || (await getGuestClaims(req, now)) !== null;
  if (!isSignedIn) throw new ApiError("UNAUTHENTICATED", "Please log in.");
  throw new ApiError("FORBIDDEN", message);
}

export async function requireStaff(req: Request, session: SessionRow, now: Date) {
  const viewer = await getViewer(req, session, now);
  if (viewer.role === "HOST" || viewer.role === "MODERATOR") return viewer;
  return denied(req, now, "Only the host or a moderator can do that.");
}

export async function requireHost(req: Request, session: SessionRow, now: Date) {
  const viewer = await getViewer(req, session, now);
  if (viewer.role === "HOST") return viewer;
  return denied(req, now, "Only the host can do that.");
}

export async function requireGuest(req: Request, session: SessionRow, now: Date): Promise<{ guestId: string }> {
  const guest = await getGuestClaims(req, now);
  if (!guest) throw new ApiError("UNAUTHENTICATED", "Join the session first.");
  if (guest.sessionId !== session.id) throw new ApiError("FORBIDDEN", "That guest pass is for another session.");
  return { guestId: guest.guestId };
}
