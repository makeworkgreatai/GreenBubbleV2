import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";

// List elections (named board-clear periods) for filtering the audit log.
export const GET = withRole("ADMIN", async () => {
  const elections = await db.election.findMany({ orderBy: { startedAt: "desc" } });
  return NextResponse.json({ elections });
});
