import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const zone = url.searchParams.get("zone") || "";
  const city = url.searchParams.get("city") || "";

  const locWhere: Prisma.LocationWhereInput = {};
  if (zone) locWhere.zone = { number: Number(zone) };
  if (city) locWhere.city = { equals: city, mode: "insensitive" };

  const [milestones, locations, allCities, allZones] = await Promise.all([
    db.statusMilestone.findMany({ orderBy: { displayOrder: "asc" } }),
    db.location.findMany({
      where: locWhere,
      include: {
        zone: { select: { number: true, name: true } },
        statuses: true,
      },
    }),
    db.location.findMany({ select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } }),
    db.zone.findMany({ orderBy: { number: "asc" }, select: { number: true, name: true } }),
  ]);

  const totalLocations = locations.length;

  const milestoneStats = milestones.map((m) => {
    const doneList: { id: number; name: string; pollId: string | null }[] = [];
    const notDoneList: { id: number; name: string; pollId: string | null }[] = [];
    for (const l of locations) {
      const isDone = l.statuses.some((s) => s.milestoneId === m.id && s.value);
      const entry = { id: l.id, name: l.name, pollId: l.pollId };
      if (isDone) doneList.push(entry);
      else notDoneList.push(entry);
    }
    return {
      id: m.id,
      label: m.label,
      done: doneList.length,
      total: totalLocations,
      pct: totalLocations > 0 ? Math.round((doneList.length / totalLocations) * 100) : 0,
      doneList,
      notDoneList,
    };
  });

  const zoneMap = new Map<number, { name: string; total: number; allDone: number }>();
  for (const loc of locations) {
    const z = zoneMap.get(loc.zone.number) || { name: loc.zone.name, total: 0, allDone: 0 };
    z.total++;
    const allDone = milestones.every((m) =>
      loc.statuses.some((s) => s.milestoneId === m.id && s.value)
    );
    if (allDone) z.allDone++;
    zoneMap.set(loc.zone.number, z);
  }
  const zoneStats = Array.from(zoneMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([num, z]) => ({
      zone: num,
      name: z.name,
      total: z.total,
      allDone: z.allDone,
      pct: z.total > 0 ? Math.round((z.allDone / z.total) * 100) : 0,
    }));

  // Per-city stats
  const cityMap = new Map<string, { total: number; allDone: number }>();
  for (const loc of locations) {
    const c = loc.city || "Unknown";
    const entry = cityMap.get(c) || { total: 0, allDone: 0 };
    entry.total++;
    const allDone = milestones.every((m) =>
      loc.statuses.some((s) => s.milestoneId === m.id && s.value)
    );
    if (allDone) entry.allDone++;
    cityMap.set(c, entry);
  }
  const cityStats = Array.from(cityMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, c]) => ({
      name,
      total: c.total,
      allDone: c.allDone,
      pct: c.total > 0 ? Math.round((c.allDone / c.total) * 100) : 0,
    }));

  const fullyComplete = locations.filter((l) =>
    milestones.every((m) => l.statuses.some((s) => s.milestoneId === m.id && s.value))
  ).length;

  return NextResponse.json({
    totalLocations,
    fullyComplete,
    overallPct: totalLocations > 0 ? Math.round((fullyComplete / totalLocations) * 100) : 0,
    milestoneStats,
    zoneStats,
    cityStats,
    milestones: milestones.map((m) => ({ id: m.id, key: m.key, label: m.label })),
    cities: allCities.map((c) => c.city).filter(Boolean),
    zones: allZones,
  });
}
