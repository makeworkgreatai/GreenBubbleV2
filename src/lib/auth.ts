import { sign, verify } from "jsonwebtoken";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "14d";
const COOKIE_NAME = "gb_session";

export interface SessionPayload {
  userId: number;
  displayName: string;
  role: Role;
  zoneId: number | null;
}

export function createToken(payload: SessionPayload): string {
  return sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = createToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 days
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Role hierarchy for permission checks
const ROLE_LEVEL: Record<Role, number> = {
  ADMIN: 5,
  SUPERVISOR: 4,
  ZONE_CAPTAIN: 3,
  PHONE_OPERATOR: 2,
  VIEWER: 1,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}

export function canEditZone(
  userRole: Role,
  userZoneId: number | null,
  targetZoneId: number
): boolean {
  if (userRole === "VIEWER") return false;
  if (userRole === "ZONE_CAPTAIN") return userZoneId === targetZoneId;
  return true; // ADMIN, SUPERVISOR, PHONE_OPERATOR can edit all zones
}

export function canViewZone(
  userRole: Role,
  userZoneId: number | null,
  targetZoneId: number
): boolean {
  if (userRole === "ZONE_CAPTAIN") return userZoneId === targetZoneId;
  return true; // everyone else sees all zones
}
