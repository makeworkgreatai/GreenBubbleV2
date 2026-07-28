import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const CONFIG_PATH = join(process.cwd(), ".open-access");

function isOpenAccessEnabled(): boolean {
  try {
    return existsSync(CONFIG_PATH) && readFileSync(CONFIG_PATH, "utf8").trim() === "true";
  } catch {
    return false;
  }
}

export async function GET() {
  if (!isOpenAccessEnabled()) {
    return NextResponse.json({ error: "Open access is disabled" }, { status: 403 });
  }

  const [milestones, locations] = await Promise.all([
    db.statusMilestone.findMany({ orderBy: { displayOrder: "asc" } }),
    db.location.findMany({
      include: {
        zone: true,
        statuses: {
          include: { updatedByUser: { select: { displayName: true } } },
        },
        precincts: { select: { label: true } },
      },
      orderBy: [{ zoneId: "asc" }, { name: "asc" }],
    }),
  ]);

  // Public view must not expose PII — strip contact details and SMS numbers
  // from the payload entirely (not just visually hidden in the UI).
  const safeLocations = locations.map((l) => ({ ...l, smsPhone: null, contacts: [] }));

  return NextResponse.json({ milestones, locations: safeLocations });
}
