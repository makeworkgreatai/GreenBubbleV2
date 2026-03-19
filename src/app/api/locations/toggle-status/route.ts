import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/middleware";
import { canEditZone } from "@/lib/auth";
import { broadcast } from "@/lib/events";

export const POST = withAuth(async (req, { session }) => {
  const { locationId, milestoneId, reason } = await req.json();

  if (!locationId || !milestoneId) {
    return NextResponse.json(
      { error: "locationId and milestoneId are required" },
      { status: 400 }
    );
  }

  // Get the location to check zone permissions
  const location = await db.location.findUnique({
    where: { id: locationId },
    select: { zoneId: true },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  if (!canEditZone(session.role, session.zoneId, location.zoneId)) {
    return NextResponse.json({ error: "No permission to edit this zone" }, { status: 403 });
  }

  // Find current status
  const current = await db.locationStatus.findUnique({
    where: { locationId_milestoneId: { locationId, milestoneId } },
  });

  if (!current) {
    return NextResponse.json({ error: "Status not found" }, { status: 404 });
  }

  const newValue = !current.value;

  // Require reason when unselecting
  if (!newValue && !reason?.trim()) {
    return NextResponse.json(
      { error: "A reason is required when unselecting" },
      { status: 400 }
    );
  }

  // Update status
  const updated = await db.locationStatus.update({
    where: { id: current.id },
    data: {
      value: newValue,
      updatedBy: session.userId,
      updatedAt: new Date(),
    },
    include: { updatedByUser: { select: { displayName: true } } },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      locationId,
      field: `milestone_${milestoneId}`,
      oldValue: String(!newValue),
      newValue: String(newValue),
      userId: session.userId,
      reason: reason?.trim() || null,
    },
  });

  // Broadcast to all connected clients
  broadcast({
    type: "status_update",
    locationId,
    milestoneId,
    value: updated.value,
    updatedAt: updated.updatedAt.toISOString(),
    updatedByUser: updated.updatedByUser,
  });

  return NextResponse.json({ status: updated });
});
