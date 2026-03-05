import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const zoneCount = await db.zone.count();
    const locationCount = await db.location.count();
    const milestoneCount = await db.statusMilestone.count();
    const userCount = await db.user.count();

    return NextResponse.json({
      status: "ok",
      database: "connected",
      counts: {
        zones: zoneCount,
        locations: locationCount,
        milestones: milestoneCount,
        users: userCount,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", database: "disconnected", error: String(e) },
      { status: 500 }
    );
  }
}
