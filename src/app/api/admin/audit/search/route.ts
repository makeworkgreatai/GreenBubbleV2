import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { Prisma } from "@prisma/client";
import { easternToUtc } from "@/lib/time";

export const GET = withRole("ADMIN", async (req) => {
  const url = new URL(req.url);
  const field = url.searchParams.get("field") || "";
  const user = url.searchParams.get("user") || "";
  const locationId = url.searchParams.get("locationId") || "";
  const dateFrom = url.searchParams.get("from") || "";
  const dateTo = url.searchParams.get("to") || "";
  const electionId = url.searchParams.get("election") || "";
  const search = url.searchParams.get("q") || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = 100;

  const where: Prisma.AuditLogWhereInput = {};

  if (field) where.field = { contains: field };
  if (locationId) where.locationId = Number(locationId) || undefined;
  if (user) where.user = { displayName: { contains: user, mode: "insensitive" } };
  // Time window: an election defines a default range; explicit From/To override.
  let gte: Date | undefined;
  let lte: Date | undefined;
  if (electionId) {
    const el = await db.election.findUnique({ where: { id: Number(electionId) || 0 } });
    if (el) {
      gte = el.startedAt;
      lte = el.endedAt ?? undefined;
    }
  }
  // Accept datetime-local ("2026-07-28T13:30") or legacy date-only ("2026-07-28").
  const from = easternToUtc(dateFrom);
  const to = easternToUtc(dateTo.includes("T") ? dateTo : dateTo ? dateTo + "T23:59:59" : "");
  if (from) gte = from;
  if (to) lte = to;
  if (gte || lte) {
    where.createdAt = {};
    if (gte) where.createdAt.gte = gte;
    if (lte) where.createdAt.lte = lte;
  }
  if (search) {
    where.OR = [
      { field: { contains: search, mode: "insensitive" } },
      { oldValue: { contains: search, mode: "insensitive" } },
      { newValue: { contains: search, mode: "insensitive" } },
      { reason: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logs, total, milestones] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
    db.statusMilestone.findMany({ select: { id: true, label: true } }),
  ]);

  // Resolve milestone_<id> fields to a human label (e.g. "Monday Delivery")
  // so the audit log and CSV show which specific status changed.
  const msLabel = new Map(milestones.map((m) => [m.id, m.label]));
  const withLabels = logs.map((l) => {
    let milestoneLabel: string | null = null;
    if (l.field.startsWith("milestone_")) {
      milestoneLabel = msLabel.get(Number(l.field.slice("milestone_".length))) ?? null;
    }
    return { ...l, milestoneLabel };
  });

  return NextResponse.json({ logs: withLabels, total, page, pages: Math.ceil(total / limit) });
});
