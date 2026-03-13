import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/middleware";

export const GET = withAuth(async (_req, { session }) => {
  const isZoneCaptain = session.role === "ZONE_CAPTAIN";

  const [milestones, locations] = await Promise.all([
    db.statusMilestone.findMany({ orderBy: { displayOrder: "asc" } }),
    db.location.findMany({
      where: isZoneCaptain && session.zoneId
        ? { zoneId: session.zoneId }
        : undefined,
      include: {
        zone: true,
        statuses: {
          include: { updatedByUser: { select: { displayName: true } } },
        },
        precincts: { select: { label: true } },
        contacts: { select: { id: true, name: true, title: true, phones: true } },
      },
      orderBy: [{ zoneId: "asc" }, { name: "asc" }],
    }),
  ]);

  return NextResponse.json({ milestones, locations, session });
});
