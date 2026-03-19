import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { broadcast } from "@/lib/events";

export const POST = withRole("ADMIN", async (_req, { session }) => {
  await db.locationStatus.updateMany({
    data: {
      value: false,
      updatedBy: session.userId,
      updatedAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      locationId: 0,
      field: "board_reset",
      oldValue: "all",
      newValue: "false",
      userId: session.userId,
      reason: "Full board reset",
    },
  });

  broadcast({ type: "board_reset" });

  return NextResponse.json({ success: true });
});
