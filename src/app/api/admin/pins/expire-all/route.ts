import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";

export const POST = withRole("ADMIN", async (_req, { session }) => {
  const result = await db.user.updateMany({
    where: {
      role: { not: "ADMIN" },
      active: true,
    },
    data: {
      expiresAt: new Date(), // expire immediately
    },
  });

  await db.auditLog.create({
    data: {
      field: "pin_expire_all",
      newValue: `${result.count} PINs expired`,
      userId: session.userId,
    },
  });

  return NextResponse.json({ expired: result.count });
});
