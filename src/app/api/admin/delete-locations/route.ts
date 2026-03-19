import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { broadcast } from "@/lib/events";

export const POST = withRole("ADMIN", async (_req, { session }) => {
  const count = await db.location.count();

  await db.$transaction([
    db.locationStatus.deleteMany(),
    db.contact.deleteMany(),
    db.precinct.deleteMany(),
    db.location.deleteMany(),
  ]);

  await db.auditLog.create({
    data: {
      field: "delete_all_locations",
      oldValue: `${count} locations`,
      newValue: "0",
      userId: session.userId,
      reason: "Full location wipe",
    },
  });

  broadcast({ type: "location_change" });

  return NextResponse.json({ success: true, deleted: count });
});
