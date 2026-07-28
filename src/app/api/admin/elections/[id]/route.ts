import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { easternToUtc } from "@/lib/time";

function idFrom(req: Request): number {
  return Number(req.url.split("/elections/")[1]?.split(/[/?]/)[0]) || 0;
}

// Update an election's name, test flag, or time range.
export const PATCH = withRole("ADMIN", async (req) => {
  const id = idFrom(req);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.isTest === "boolean") data.isTest = body.isTest;
  if (body?.startedAt) {
    const s = easternToUtc(body.startedAt);
    if (s) data.startedAt = s;
  }
  if ("endedAt" in (body || {})) {
    data.endedAt = body.endedAt ? easternToUtc(body.endedAt) ?? null : null;
  }

  const election = await db.election.update({ where: { id }, data });
  return NextResponse.json({ election });
});

// Delete an election tag (does NOT touch audit data).
export const DELETE = withRole("ADMIN", async (req) => {
  const id = idFrom(req);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await db.election.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
