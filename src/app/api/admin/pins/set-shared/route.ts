import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { Role } from "@prisma/client";

// POST — set the shared PIN and/or expiry for an ENTIRE role category.
// Blanket-updates the login PIN of every account in that role.
export const POST = withRole("SUPERVISOR", async (req, { session }) => {
  const body = await req.json();
  const { role, pin, expiresAt } = body as {
    role: Role;
    pin?: string;
    expiresAt?: string | null;
  };

  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  // Supervisors can only manage lower roles
  if (session.role === "SUPERVISOR" && (role === "ADMIN" || role === "SUPERVISOR")) {
    return NextResponse.json(
      { error: "Supervisors can only manage PINs for lower roles" },
      { status: 403 }
    );
  }

  const hasPin = typeof pin === "string" && pin.length > 0;
  const hasExpiry = "expiresAt" in body;

  if (hasPin && !/^\d{4,}$/.test(pin as string)) {
    return NextResponse.json({ error: "PIN must be at least 4 digits" }, { status: 400 });
  }
  if (!hasPin && !hasExpiry) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const pinHash = hasPin ? await hash(pin as string, 10) : undefined;
  const expiryValue: Date | null | undefined = hasExpiry ? (expiresAt ? new Date(expiresAt) : null) : undefined;

  // Blanket-update every account in this category
  await db.user.updateMany({
    where: { role },
    data: {
      ...(pinHash !== undefined ? { pinHash } : {}),
      ...(expiryValue !== undefined ? { expiresAt: expiryValue } : {}),
    },
  });

  // Maintain a "shared" holder account so the readable PIN can be displayed,
  // and so pin-only (shared) login works for the category.
  if (hasPin) {
    const holder = await db.user.findFirst({ where: { role, pinMode: "shared" } });
    if (holder) {
      await db.user.update({
        where: { id: holder.id },
        data: { sharedPin: pin as string, ...(expiryValue !== undefined ? { expiresAt: expiryValue } : {}) },
      });
    } else {
      await db.user.create({
        data: {
          displayName: `Shared ${role.replace(/_/g, " ")}`,
          pinHash: pinHash as string,
          role,
          pinMode: "shared",
          sharedPin: pin as string,
          active: true,
          expiresAt: expiryValue ?? null,
        },
      });
    }
  }

  await db.auditLog.create({
    data: {
      field: hasPin ? "shared_pin_set" : "shared_pin_expiry",
      newValue: `${role} category ${hasPin ? "PIN set" : "expiry updated"}`,
      userId: session.userId,
    },
  });

  return NextResponse.json({ ok: true });
});
