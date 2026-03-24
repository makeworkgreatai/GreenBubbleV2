import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

// One-time setup endpoint — seeds admin user and milestones
// Database tables are created during build via "prisma db push"
export async function GET() {
  try {
    // Check if admin already exists
    const existing = await db.user.findFirst({ where: { role: "ADMIN" } });
    if (existing) {
      return NextResponse.json({ message: "Already set up", admin: existing.displayName });
    }

    // Create admin user
    const pinHash = await hash("1234", 10);
    await db.user.create({
      data: {
        displayName: "GB Admin",
        pinHash,
        role: "ADMIN",
        pinMode: "named",
        active: true,
      },
    });

    // Create default milestones
    const milestones = [
      { key: "monday_delivery", label: "Monday Delivery", displayOrder: 1 },
      { key: "monday_arrival", label: "Monday Arrival", displayOrder: 2 },
      { key: "monday_close", label: "Monday Close", displayOrder: 3 },
      { key: "building_open", label: "Building Open", displayOrder: 4 },
      { key: "tuesday_arrival", label: "Tuesday Arrival", displayOrder: 5 },
      { key: "open_ready", label: "Open Ready", displayOrder: 6 },
      { key: "close_poll_ready", label: "Close Poll Ready", displayOrder: 7 },
    ];

    for (const m of milestones) {
      await db.statusMilestone.upsert({
        where: { key: m.key },
        create: m,
        update: {},
      });
    }

    return NextResponse.json({
      message: "Setup complete!",
      admin: "GB Admin",
      pin: "1234",
      milestones: milestones.length,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Setup failed",
    }, { status: 500 });
  }
}
