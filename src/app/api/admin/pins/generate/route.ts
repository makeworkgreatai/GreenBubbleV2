import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { Role } from "@prisma/client";

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit PIN
}

export const POST = withRole("SUPERVISOR", async (req, { session }) => {
  const body = await req.json();
  const { role, count, zoneId, expiresAt, pinMode, displayName: customName, password } = body as {
    role: Role;
    count: number;
    zoneId?: number;
    expiresAt?: string;
    pinMode?: string;
    displayName?: string;
    password?: string;
  };

  const mode = pinMode || "named";

  // Validate
  const effectiveCount = mode === "shared" ? 1 : count;
  if (!role || !effectiveCount || effectiveCount < 1 || effectiveCount > 100) {
    return NextResponse.json(
      { error: "Role and count (1-100) are required" },
      { status: 400 }
    );
  }

  if (role === "ZONE_CAPTAIN" && !zoneId) {
    return NextResponse.json(
      { error: "Zone is required for Zone Captain role" },
      { status: 400 }
    );
  }

  // Supervisors can create any role except Admin
  if (session.role === "SUPERVISOR" && role === "ADMIN") {
    return NextResponse.json(
      { error: "Only admins can create Admin accounts" },
      { status: 403 }
    );
  }

  // Check for duplicate name
  if (customName) {
    const existing = await db.user.findFirst({
      where: { displayName: { equals: customName, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `User "${customName}" already exists` },
        { status: 400 }
      );
    }
  }

  // Named accounts inherit the role's category (shared) PIN if one is set,
  // so people log in with their own name + the same PIN as the rest of the role.
  let inheritedPin = "";
  if (mode === "named" && !password) {
    const holder = await db.user.findFirst({ where: { role, pinMode: "shared" } });
    if (holder?.sharedPin) inheritedPin = holder.sharedPin;
  }

  const pins: { pin: string; displayName: string }[] = [];
  const users = [];

  for (let i = 0; i < effectiveCount; i++) {
    const pin = password || inheritedPin || generatePin();
    const pinHash = await hash(pin, 10);
    const displayName = customName || `${mode} ${role.replace("_", " ")} ${Date.now()}-${i}`;

    users.push({
      displayName,
      pinHash,
      role,
      zoneId: role === "ZONE_CAPTAIN" ? zoneId ?? null : null,
      pinMode: mode,
      sharedPin: mode === "shared" ? pin : null,
      active: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    pins.push({ pin, displayName });
  }

  await db.user.createMany({ data: users });

  await db.auditLog.create({
    data: {
      field: "pin_generate",
      newValue: `${effectiveCount} ${mode} ${role} PINs`,
      userId: session.userId,
    },
  });

  return NextResponse.json({ pins });
});
