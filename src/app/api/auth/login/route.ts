import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { headers } from "next/headers";

function getClientInfo(req: Request) {
  const hdrs = Object.fromEntries(new Headers(req.headers));
  const ip = hdrs["x-forwarded-for"]?.split(",")[0]?.trim() || hdrs["x-real-ip"] || "unknown";
  const userAgent = hdrs["user-agent"] || "";
  return { ip, userAgent };
}

async function logLogin(data: { userId?: number; displayName: string; success: boolean; ip: string; userAgent: string; reason?: string }) {
  await db.loginLog.create({
    data: {
      userId: data.userId || null,
      displayName: data.displayName,
      success: data.success,
      ip: data.ip,
      userAgent: data.userAgent,
      reason: data.reason || null,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { displayName, pin } = body;
  const client = getClientInfo(req);

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
      await logLogin({ userId: namedUser.id, displayName, success: false, ...client, reason: "PIN expired" });
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
      await logLogin({ userId: namedUser.id, displayName: namedUser.displayName, success: true, ...client });
      return NextResponse.json({
        user: {
          id: namedUser.id,
          displayName: namedUser.displayName,
          role: namedUser.role,
          zoneId: namedUser.zoneId,
        },
      });
    }

    await logLogin({ userId: namedUser.id, displayName, success: false, ...client, reason: "Wrong PIN" });
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
      // Give this person their own account so their entered name (not the
      // shared holder's name) shows on bubbles and in the audit log.
      // Reuse an existing account with the same name, otherwise create one.
      let account = await db.user.findFirst({
        where: { displayName: { equals: displayName, mode: "insensitive" }, role: user.role },
      });
      if (!account) {
        account = await db.user.create({
          data: {
            displayName,
            pinHash: user.pinHash,
            role: user.role,
            zoneId: user.zoneId,
            pinMode: "named",
            active: true,
            expiresAt: user.expiresAt,
          },
        });
      }

      await setSessionCookie({
        userId: account.id,
        displayName: account.displayName,
        role: account.role,
        zoneId: account.zoneId,
      });
      await logLogin({ userId: account.id, displayName: account.displayName, success: true, ...client, reason: `${user.pinMode} PIN` });
      return NextResponse.json({
        user: {
          id: account.id,
          displayName: account.displayName,
          role: account.role,
          zoneId: account.zoneId,
        },
      });
    }
  }

  // 3. Nothing matched
  await logLogin({ displayName, success: false, ...client, reason: "No matching user/PIN" });

  return NextResponse.json(
    { error: "Invalid name or PIN" },
    { status: 401 }
  );
}
