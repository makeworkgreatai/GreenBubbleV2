import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";

export const POST = withRole("ADMIN", async (_req, { session }) => {
  // Get default zone
  const zone = await db.zone.findFirst({ orderBy: { number: "asc" } });
  if (!zone)
    return NextResponse.json({ error: "No zones exist" }, { status: 400 });

  // Get all milestones so we can create status rows
  const milestones = await db.statusMilestone.findMany();

  const location = await db.location.create({
    data: {
      name: "New Location",
      address: "",
      city: "",
      zoneId: zone.id,
      contacts: {
        create: { name: "Contact", title: "", phones: [{ label: "Phone", number: "" }] },
      },
      precincts: {
        create: { label: "NEW", wardName: "" },
      },
      statuses: {
        create: milestones.map((m) => ({
          milestoneId: m.id,
          value: false,
        })),
      },
    },
    include: {
      zone: true,
      statuses: { include: { updatedByUser: { select: { displayName: true } } } },
      precincts: { select: { id: true, label: true, wardName: true } },
      contacts: true,
    },
  });

  await db.auditLog.create({
    data: {
      locationId: location.id,
      field: "add_location",
      oldValue: null,
      newValue: location.name,
      userId: session.userId,
    },
  });

  return NextResponse.json({ location });
});
