import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth, withRole } from "@/lib/middleware";
import { canEditZone } from "@/lib/auth";
import type { Role } from "@prisma/client";

const LOCATION_INCLUDE = {
  zone: true,
  statuses: { include: { updatedByUser: { select: { displayName: true } } } },
  precincts: { select: { id: true, label: true, wardName: true } },
  contacts: true,
};

async function getLocationWithPermCheck(
  id: number,
  session: { role: Role; zoneId: number | null }
) {
  const location = await db.location.findUnique({
    where: { id },
    include: { contacts: true, precincts: true },
  });
  if (!location) return { error: "Location not found", status: 404 };
  if (!canEditZone(session.role, session.zoneId, location.zoneId))
    return { error: "No permission to edit this zone", status: 403 };
  return { location };
}

function parseId(req: Request) {
  const url = new URL(req.url);
  return Number(url.pathname.split("/").pop());
}

export const PATCH = withAuth(async (req, { session }) => {
  const id = parseId(req);
  if (!id || isNaN(id))
    return NextResponse.json({ error: "Invalid location ID" }, { status: 400 });

  const body = await req.json();
  const { field, value, index, action } = body;

  const check = await getLocationWithPermCheck(id, session);
  if ("error" in check)
    return NextResponse.json({ error: check.error }, { status: check.status });
  const { location } = check;

  let oldValue: string | null = null;
  const trimmed = typeof value === "string" ? value.trim() : "";

  // --- ADD actions ---
  if (action === "add") {
    if (field === "contactPhone") {
      const contact = location.contacts[0];
      if (!contact)
        return NextResponse.json({ error: "No contact" }, { status: 400 });
      const phones = contact.phones as { label: string; number: string }[];
      phones.push({ label: "Phone", number: "" });
      await db.contact.update({ where: { id: contact.id }, data: { phones } });
      await audit(id, "add_phone", null, "new phone", session.userId);
    } else if (field === "contact") {
      await db.contact.create({
        data: { locationId: id, name: "New Contact", title: "", phones: [{ label: "Phone", number: "" }] },
      });
      await audit(id, "add_contact", null, "New Contact", session.userId);
    } else if (field === "precinct") {
      await db.precinct.create({
        data: { locationId: id, label: "NEW", wardName: "" },
      });
      await audit(id, "add_precinct", null, "NEW", session.userId);
    }
    const updated = await db.location.findUnique({ where: { id }, include: LOCATION_INCLUDE });
    return NextResponse.json({ location: updated });
  }

  // --- EDIT / DELETE by field ---
  const EDITABLE_FIELDS = [
    "name", "address", "city", "pollId",
    "contactName", "contactTitle", "contactPhone", "contactPhoneLabel",
    "precinctLabel",
  ];
  if (!field || !EDITABLE_FIELDS.includes(field))
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });

  // --- Contact fields ---
  if (field.startsWith("contact")) {
    const contact = location.contacts[0];
    if (!contact)
      return NextResponse.json({ error: "No contact" }, { status: 400 });

    if (field === "contactName") {
      oldValue = contact.name;
      if (!trimmed) {
        // Delete the entire contact
        await db.contact.delete({ where: { id: contact.id } });
        await audit(id, "delete_contact", oldValue, null, session.userId);
      } else {
        await db.contact.update({ where: { id: contact.id }, data: { name: trimmed } });
        await audit(id, "edit_contactName", oldValue, trimmed, session.userId);
      }
    } else if (field === "contactTitle") {
      oldValue = contact.title;
      await db.contact.update({ where: { id: contact.id }, data: { title: trimmed } });
      await audit(id, "edit_contactTitle", oldValue, trimmed, session.userId);
    } else if (field === "contactPhone" || field === "contactPhoneLabel") {
      const phones = contact.phones as { label: string; number: string }[];
      const phoneIdx = typeof index === "number" ? index : 0;
      oldValue = field === "contactPhone"
        ? phones[phoneIdx]?.number || ""
        : phones[phoneIdx]?.label || "";

      if (field === "contactPhone" && !trimmed) {
        // Delete this phone entry
        const removed = phones.splice(phoneIdx, 1);
        await db.contact.update({ where: { id: contact.id }, data: { phones } });
        await audit(id, "delete_phone", removed[0]?.number || "", null, session.userId);
      } else if (field === "contactPhoneLabel" && !trimmed) {
        // Don't allow empty label, set default
        phones[phoneIdx] = { ...phones[phoneIdx], label: "Phone" };
        await db.contact.update({ where: { id: contact.id }, data: { phones } });
        await audit(id, "edit_contactPhoneLabel", oldValue, "Phone", session.userId);
      } else {
        const updated = [...phones];
        if (field === "contactPhone") {
          updated[phoneIdx] = { ...updated[phoneIdx], number: trimmed };
        } else {
          updated[phoneIdx] = { ...updated[phoneIdx], label: trimmed };
        }
        await db.contact.update({ where: { id: contact.id }, data: { phones: updated } });
        await audit(id, `edit_${field}`, oldValue, trimmed, session.userId);
      }
    }
  }
  // --- Precinct ---
  else if (field === "precinctLabel") {
    const precinctIdx = typeof index === "number" ? index : 0;
    const precinct = location.precincts[precinctIdx];
    if (!precinct)
      return NextResponse.json({ error: "Precinct not found" }, { status: 400 });
    oldValue = precinct.label;
    if (!trimmed) {
      // Delete this precinct
      await db.precinct.delete({ where: { id: precinct.id } });
      await audit(id, "delete_precinct", oldValue, null, session.userId);
    } else {
      await db.precinct.update({ where: { id: precinct.id }, data: { label: trimmed } });
      await audit(id, "edit_precinctLabel", oldValue, trimmed, session.userId);
    }
  }
  // --- Location fields ---
  else {
    oldValue = String((location as Record<string, unknown>)[field] ?? "");
    await db.location.update({
      where: { id },
      data: { [field]: trimmed, version: { increment: 1 } },
    });
    await audit(id, `edit_${field}`, oldValue, trimmed, session.userId);
  }

  const updated = await db.location.findUnique({ where: { id }, include: LOCATION_INCLUDE });
  return NextResponse.json({ location: updated });
});

export const DELETE = withRole("ADMIN", async (req, { session }) => {
  const id = parseId(req);
  if (!id || isNaN(id))
    return NextResponse.json({ error: "Invalid location ID" }, { status: 400 });

  const location = await db.location.findUnique({ where: { id }, select: { name: true } });
  if (!location)
    return NextResponse.json({ error: "Location not found" }, { status: 404 });

  await db.location.delete({ where: { id } });
  await audit(id, "delete_location", location.name, null, session.userId);

  return NextResponse.json({ success: true });
});

async function audit(
  locationId: number,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  userId: number
) {
  await db.auditLog.create({
    data: { locationId, field, oldValue, newValue, userId },
  });
}
