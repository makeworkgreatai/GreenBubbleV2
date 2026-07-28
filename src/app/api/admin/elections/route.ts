import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { easternToUtc } from "@/lib/time";

// List elections (named board-clear periods) for filtering the audit log.
export const GET = withRole("ADMIN", async () => {
  const elections = await db.election.findMany({ orderBy: { startedAt: "desc" } });
  return NextResponse.json({ elections });
});

// Create an election by tagging a time range (name + test/real).
export const POST = withRole("ADMIN", async (req) => {
  const body = await req.json().catch(() => ({}));
  const name = (body?.name || "").trim();
  const isTest = Boolean(body?.isTest);
  const startedAt = easternToUtc(body?.startedAt || "");
  const endedAt = body?.endedAt ? easternToUtc(body.endedAt) : null;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!startedAt) return NextResponse.json({ error: "Start date/time is required" }, { status: 400 });
  if (endedAt && endedAt <= startedAt) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }

  const election = await db.election.create({ data: { name, isTest, startedAt, endedAt } });
  return NextResponse.json({ election });
});
