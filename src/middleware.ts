import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/health", "/api/twilio", "/api/view", "/api/events", "/api/changelog", "/view", "/changelog"];

// Pages/APIs that require ADMIN role
const ADMIN_PATHS = ["/admin", "/api/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get("gb_session");
  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check admin routes — decode JWT to get role
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    try {
      // Decode JWT payload without full verification (middleware can't use jsonwebtoken)
      const parts = session.value.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const role = payload.role;
        if (role !== "ADMIN" && role !== "SUPERVISOR") {
          if (pathname.startsWith("/api")) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
          }
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    } catch {
      // If decode fails, let the API-level auth handle it
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
