import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";

// GET — list all users with stats
export const GET = withRole("SUPERVISOR", async () => {
  const users = await db.user.findMany({
    include: {
      zone: { select: { number: true, name: true } },
      _count: { select: { auditLogs: true, statuses: true } },
    },
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      role: u.role,
      zoneId: u.zoneId,
      zone: u.zone,
      pinMode: u.pinMode,
      active: u.active,
      expiresAt: u.expiresAt,
      createdAt: u.createdAt,
      auditCount: u._count.auditLogs,
      statusUpdates: u._count.statuses,
      isExpired: u.expiresAt ? new Date(u.expiresAt) < new Date() : false,
    })),
  });
});
