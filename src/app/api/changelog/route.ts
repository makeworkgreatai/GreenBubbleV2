import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const field = url.searchParams.get("field") || "";
  const q = url.searchParams.get("q") || "";
  const zone = url.searchParams.get("zone") || "";
  const city = url.searchParams.get("city") || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = 50;

  // Resolve matching location IDs from search/zone/city filters
  let matchingLocationIds: number[] | null = null;
  const locWhere: Prisma.LocationWhereInput = {};
  if (q.trim()) locWhere.name = { contains: q.trim(), mode: "insensitive" };
  if (zone) locWhere.zone = { number: Number(zone) };
  if (city) locWhere.city = { equals: city, mode: "insensitive" };

  if (q.trim() || zone || city) {
    const matchingLocations = await db.location.findMany({
      where: locWhere,
      select: { id: true },
    });
    matchingLocationIds = matchingLocations.map((l) => l.id);
  }

  const fieldWhere = field && field !== "all" ? { equals: field } : { startsWith: "milestone_" };
  const where = {
    locationId: matchingLocationIds !== null ? { in: matchingLocationIds } : { not: null as unknown as undefined },
    field: fieldWhere,
  };

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

  const locationIds = [...new Set(logs.map((l) => l.locationId).filter(Boolean))] as number[];
  const locations = await db.location.findMany({
    where: { id: { in: locationIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(locations.map((l) => [l.id, l.name]));

  const enriched = logs.map((l) => ({
    ...l,
    locationName: l.locationId ? nameMap.get(l.locationId) || `Location #${l.locationId}` : null,
  }));

  return NextResponse.json({ logs: enriched, total, page, pages: Math.ceil(total / limit) });
}
