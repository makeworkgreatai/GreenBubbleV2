import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { broadcast } from "@/lib/events";

export const POST = withRole("ADMIN", async (req, { session }) => {
  const body = await req.json().catch(() => ({} as { name?: string; isTest?: boolean }));
  const now = new Date();
  const name = (body?.name || "").trim() || `Election ${now.toISOString().slice(0, 10)}`;
  const isTest = Boolean(body?.isTest);

  // Close the current open election (the one whose data is being cleared),
  // tagging it with the given name + test/real flag. If none is open yet
  // (existing installs), create one spanning all prior audit history.
  const open = await db.election.findFirst({ where: { endedAt: null }, orderBy: { startedAt: "desc" } });
  if (open) {
    await db.election.update({ where: { id: open.id }, data: { name, isTest, endedAt: now } });
  } else {
    const earliest = await db.auditLog.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
    await db.election.create({ data: { name, isTest, startedAt: earliest?.createdAt ?? now, endedAt: now } });
  }
  // Start a new open election for the fresh board.
  await db.election.create({ data: { name: "Current", startedAt: now } });

  await db.locationStatus.updateMany({
    data: {
      value: false,
      // Clear attribution so a reset board shows no "who/when" on red bubbles
      updatedBy: null,
      updatedAt: now,
    },
  });

  await db.auditLog.create({
    data: {
      locationId: 0,
      field: "board_reset",
      oldValue: "all",
      newValue: name,
      userId: session.userId,
      reason: `Cleared ${isTest ? "TEST" : "election"}: ${name}`,
    },
  });

  broadcast({ type: "board_reset" });

  return NextResponse.json({ success: true });
});
