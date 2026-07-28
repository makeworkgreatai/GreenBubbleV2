import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { Prisma } from "@prisma/client";

// Interpret a datetime-local string ("2026-07-28T13:30") as Eastern wall-clock
// time and return the matching UTC Date. DST-safe (handles EDT and EST).
function easternToUtc(local: string): Date | undefined {
  if (!local) return undefined;
  const [datePart, timePart = "00:00"] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  if (!y || !m || !d) return undefined;

  const tzOffsetMinutes = (date: Date): number => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      }).formatToParts(date).map((p) => [p.type, p.value])
    );
    const asUTC = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour === "24" ? "0" : parts.hour), Number(parts.minute), Number(parts.second)
    );
    return (asUTC - date.getTime()) / 60000;
  };

  let utc = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 2; i++) {
    const off = tzOffsetMinutes(new Date(utc));
    utc = Date.UTC(y, m - 1, d, hh, mm) - off * 60000;
  }
  return new Date(utc);
}

export const GET = withRole("ADMIN", async (req) => {
  const url = new URL(req.url);
  const field = url.searchParams.get("field") || "";
  const user = url.searchParams.get("user") || "";
  const locationId = url.searchParams.get("locationId") || "";
  const dateFrom = url.searchParams.get("from") || "";
  const dateTo = url.searchParams.get("to") || "";
  const search = url.searchParams.get("q") || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = 100;

  const where: Prisma.AuditLogWhereInput = {};

  if (field) where.field = { contains: field };
  if (locationId) where.locationId = Number(locationId) || undefined;
  if (user) where.user = { displayName: { contains: user, mode: "insensitive" } };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    // Accept datetime-local ("2026-07-28T13:30") or legacy date-only ("2026-07-28").
    const from = easternToUtc(dateFrom);
    const to = easternToUtc(dateTo.includes("T") ? dateTo : dateTo ? dateTo + "T23:59:59" : "");
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }
  if (search) {
    where.OR = [
      { field: { contains: search, mode: "insensitive" } },
      { oldValue: { contains: search, mode: "insensitive" } },
      { newValue: { contains: search, mode: "insensitive" } },
      { reason: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
});
