import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { hash } from "bcryptjs";

// PATCH — update user fields
export const PATCH = withRole("SUPERVISOR", async (req, { session }) => {
  const id = Number(req.url.split("/users/")[1]);
  if (!id) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  const body = await req.json();
  const { field, value } = body as { field: string; value: string };

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Supervisors cannot edit admins or other supervisors
  if (session.role === "SUPERVISOR" && (user.role === "ADMIN" || user.role === "SUPERVISOR")) {
    return NextResponse.json({ error: "Cannot edit this user" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  let oldValue = "";
  let newValue = value;

  if (field === "displayName") {
    oldValue = user.displayName;
    data.displayName = value;
  } else if (field === "role") {
    if (session.role === "SUPERVISOR" && (value === "ADMIN" || value === "SUPERVISOR")) {
      return NextResponse.json({ error: "Cannot assign this role" }, { status: 403 });
    }
    oldValue = user.role;
    data.role = value;
  } else if (field === "zoneId") {
    oldValue = user.zoneId ? String(user.zoneId) : "";
    data.zoneId = value ? Number(value) : null;
  } else if (field === "active") {
    oldValue = String(user.active);
    data.active = value === "true";
    newValue = value === "true" ? "active" : "deactivated";
    oldValue = user.active ? "active" : "deactivated";
  } else if (field === "resetPin") {
    // Generate a new 4-digit PIN
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    data.pinHash = await hash(pin, 10);
    oldValue = "(hidden)";
    newValue = "(reset)";
    // Return the new PIN to the caller
    await db.user.update({ where: { id }, data });
    await db.auditLog.create({
      data: {
        field: "user_pin_reset",
        oldValue,
        newValue,
        userId: session.userId,
      },
    });
    return NextResponse.json({ ok: true, pin });
  } else if (field === "expiresAt") {
    oldValue = user.expiresAt ? user.expiresAt.toISOString() : "never";
    data.expiresAt = value ? new Date(value) : null;
    newValue = value || "never";
  } else {
    return NextResponse.json({ error: "Unknown field" }, { status: 400 });
  }

  await db.user.update({ where: { id }, data });

  await db.auditLog.create({
    data: {
      field: `edit_user_${field}`,
      oldValue,
      newValue,
      userId: session.userId,
    },
  });

  return NextResponse.json({ ok: true });
});

// DELETE — remove user
export const DELETE = withRole("ADMIN", async (req, { session }) => {
  const id = Number(req.url.split("/users/")[1]);
  if (!id) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot delete admin accounts" }, { status: 403 });
  }

  // Nullify references before deleting
  await db.$transaction([
    db.locationStatus.updateMany({ where: { updatedBy: id }, data: { updatedBy: null } }),
    db.auditLog.updateMany({ where: { userId: id }, data: { userId: null } }),
    db.user.delete({ where: { id } }),
  ]);

  await db.auditLog.create({
    data: {
      field: "delete_user",
      oldValue: `${user.displayName} (${user.role})`,
      userId: session.userId,
    },
  });

  return NextResponse.json({ ok: true });
});
