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
        contacts: { select: { id: true, name: true, title: true, phones: true } },
      },
      orderBy: [{ zoneId: "asc" }, { name: "asc" }],
    }),
  ]);

  return NextResponse.json({ milestones, locations });
}
