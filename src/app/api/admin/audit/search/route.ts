import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { Prisma } from "@prisma/client";

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
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59Z");
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
