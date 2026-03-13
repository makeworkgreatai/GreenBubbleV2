import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/middleware";

export const GET = withAuth(async () => {
  const count = await db.auditLog.count();
  const oldest = await db.auditLog.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  return NextResponse.json({ count, oldest: oldest?.createdAt || null });
});
