import { NextResponse } from "next/server";
import { getSession, hasMinRole, type SessionPayload } from "./auth";
import { Role } from "@prisma/client";

type RouteHandler = (
  req: Request,
  context: { session: SessionPayload }
) => Promise<Response>;

/**
 * Wraps an API route handler with authentication.
 * Returns 401 if not logged in.
 */
export function withAuth(handler: RouteHandler) {
  return async (req: Request) => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return handler(req, { session });
  };
}

/**
 * Wraps an API route handler with authentication + minimum role check.
 * Returns 401 if not logged in, 403 if insufficient role.
 */
export function withRole(minRole: Role, handler: RouteHandler) {
  return withAuth(async (req, ctx) => {
    if (!hasMinRole(ctx.session.role, minRole)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    return handler(req, ctx);
  });
}
