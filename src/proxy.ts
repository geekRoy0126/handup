// Redirects logged-out visitors away from host pages. This is only a convenience: every API route and service
// checks authorization itself (AGENTS.md §1.3).
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.cookies.has("hu_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/host/:path*", "/settings/:path*"],
};
