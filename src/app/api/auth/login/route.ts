import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const { displayName, pin } = body;

  if (!displayName || !pin) {
    return NextResponse.json(
      { error: "Name and PIN are required" },
      { status: 400 }
    );
  }

  // 1. Try "named" PINs: match by name, then verify PIN
  const namedUser = await db.user.findFirst({
    where: {
      displayName: { equals: displayName, mode: "insensitive" },
      pinMode: "named",
      active: true,
    },
  });

  if (namedUser) {
    if (namedUser.expiresAt && namedUser.expiresAt < new Date()) {
      await db.auditLog.create({
        data: { field: "login", newValue: "failed", reason: "PIN expired", userId: namedUser.id },
      });
      return NextResponse.json(
        { error: "PIN has expired. Contact an administrator." },
        { status: 401 }
      );
    }

    const valid = await compare(pin, namedUser.pinHash);
    if (valid) {
      await setSessionCookie({
        userId: namedUser.id,
        displayName: namedUser.displayName,
        role: namedUser.role,
        zoneId: namedUser.zoneId,
      });
      await db.auditLog.create({
        data: { field: "login", newValue: "success", userId: namedUser.id },
      });
      return NextResponse.json({
        user: {
          id: namedUser.id,
          displayName: namedUser.displayName,
          role: namedUser.role,
          zoneId: namedUser.zoneId,
        },
      });
    }

    // Name belongs to a named user but PIN was wrong — block completely
    // Prevents impersonation via shared/open PINs
    await db.auditLog.create({
      data: { field: "login", newValue: "failed", reason: "Wrong PIN for named user", userId: namedUser.id },
    });
    return NextResponse.json(
      { error: "Invalid name or PIN" },
      { status: 401 }
    );
  }

  // 2. Try "open" and "shared" PINs: match by PIN only, use entered name
  const flexUsers = await db.user.findMany({
    where: { pinMode: { in: ["open", "shared"] }, active: true },
  });

  for (const user of flexUsers) {
    if (user.expiresAt && user.expiresAt < new Date()) continue;

    const valid = await compare(pin, user.pinHash);
    if (valid) {
      await setSessionCookie({
        userId: user.id,
        displayName,
        role: user.role,
        zoneId: user.zoneId,
      });
      await db.auditLog.create({
        data: {
          field: "login",
          newValue: "success",
          userId: user.id,
          reason: `${user.pinMode} PIN login as: ${displayName}`,
        },
      });
      return NextResponse.json({
        user: {
          id: user.id,
          displayName,
          role: user.role,
          zoneId: user.zoneId,
        },
      });
    }
  }

  // 3. Nothing matched
  await db.auditLog.create({
    data: { field: "login", newValue: "failed", reason: `Failed login: ${displayName}` },
  });

  return NextResponse.json(
    { error: "Invalid name or PIN" },
    { status: 401 }
  );
}
