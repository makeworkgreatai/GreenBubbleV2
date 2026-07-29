import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { sendSms, buildAssignmentMessage } from "@/lib/sms";

// GET — list all locations with their SMS phone assignments
export const GET = withRole("SUPERVISOR", async () => {
  const locations = await db.location.findMany({
    select: {
      id: true,
      pollId: true,
      name: true,
      smsPhone: true,
      zone: { select: { number: true, name: true } },
    },
    orderBy: [{ zone: { number: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json({ locations });
});

// PATCH — update a single location's SMS phone
export const PATCH = withRole("SUPERVISOR", async (req, { session }) => {
  const { locationId, phone, force } = await req.json();

  if (!locationId) {
    return NextResponse.json({ error: "locationId required" }, { status: 400 });
  }

  // Check for duplicate — same number can't be on two locations
  if (phone) {
    const normalized = phone.replace(/\D/g, "").slice(-10);
    const allAssigned = await db.location.findMany({
      where: { smsPhone: { not: null }, id: { not: locationId } },
    });
    const dupe = allAssigned.find(
      (l) => l.smsPhone && l.smsPhone.replace(/\D/g, "").slice(-10) === normalized
    );
    if (dupe) {
      if (force) {
        // Clear the old assignment
        await db.location.update({ where: { id: dupe.id }, data: { smsPhone: null } });
        await db.auditLog.create({
          data: {
            locationId: dupe.id,
            field: "sms_phone",
            oldValue: dupe.smsPhone,
            newValue: "(moved)",
            userId: session.userId,
          },
        });
      } else {
        return NextResponse.json(
          { error: `That number is already assigned to ${dupe.name} (${dupe.pollId})`, duplicate: true },
          { status: 400 }
        );
      }
    }
  }

  const location = await db.location.update({
    where: { id: locationId },
    data: { smsPhone: phone || null },
    select: { name: true, pollId: true },
  });

  await db.auditLog.create({
    data: {
      locationId,
      field: "sms_phone",
      newValue: phone || "(cleared)",
      userId: session.userId,
    },
  });

  // Send a welcome text to the newly assigned number with the commands.
  let smsSent = false;
  let smsError: string | undefined;
  if (phone) {
    const msg = await buildAssignmentMessage(location.name, location.pollId);
    const result = await sendSms(phone, msg);
    smsSent = result.sent;
    smsError = result.error;
  }

  return NextResponse.json({ ok: true, smsSent, smsError });
});
