import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { broadcast } from "@/lib/events";

// GET — download current board as CSV
export const GET = withRole("ADMIN", async () => {
  const [milestones, locations] = await Promise.all([
    db.statusMilestone.findMany({ orderBy: { displayOrder: "asc" } }),
    db.location.findMany({
      include: {
        zone: true,
        statuses: true,
        contacts: true,
        precincts: true,
      },
      orderBy: [{ zoneId: "asc" }, { name: "asc" }],
    }),
  ]);

  // Build CSV header
  const milestoneKeys = milestones.map((m) => m.key);
  const headers = [
    "PollID", "Name", "Address", "City", "State", "Zone",
    "ContactName", "ContactTitle", "Phones", "Precincts",
    ...milestoneKeys,
  ];

  function csvEscape(val: string): string {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  const rows = locations.map((loc) => {
    const contact = loc.contacts[0];
    const phones = contact
      ? (contact.phones as { label: string; number: string }[])
          .map((p) => `${p.label}:${p.number}`)
          .join("|")
      : "";
    const precincts = loc.precincts.map((p) => p.label).join("|");

    const statusValues = milestones.map((m) => {
      const s = loc.statuses.find((st) => st.milestoneId === m.id);
      return s?.value ? "TRUE" : "FALSE";
    });

    return [
      loc.pollId || "",
      loc.name,
      loc.address,
      loc.city,
      loc.state || "OH",
      String(loc.zone.number),
      contact?.name || "",
      contact?.title || "",
      phones,
      precincts,
      ...statusValues,
    ].map(csvEscape).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="green-bubbles-${timestamp}.csv"`,
    },
  });
});

// POST — restore board from uploaded CSV
export const POST = withRole("ADMIN", async (req, { session }) => {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
  }

  // Parse header
  const headers = parseCsvLine(lines[0]);
  const milestoneStartIdx = headers.indexOf("Precincts") + 1;
  const milestoneKeys = headers.slice(milestoneStartIdx);

  // Resolve milestone IDs from keys
  const milestones = await db.statusMilestone.findMany();
  const milestoneMap = new Map(milestones.map((m) => [m.key, m.id]));

  // Resolve zones
  const zones = await db.zone.findMany();
  const zoneByNumber = new Map(zones.map((z) => [z.number, z.id]));

  // Parse rows
  const parsed: {
    pollId: string | null;
    name: string;
    address: string;
    city: string;
    state: string;
    zoneId: number;
    contactName: string;
    contactTitle: string;
    phones: { label: string; number: string }[];
    precincts: string[];
    statuses: { key: string; value: boolean }[];
  }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < milestoneStartIdx) continue;

    const zoneNum = Number(cols[5]);
    const zoneId = zoneByNumber.get(zoneNum);
    if (!zoneId) continue; // skip unknown zones

    const phones: { label: string; number: string }[] = cols[8]
      ? cols[8].split("|").map((p) => {
          const [label, ...rest] = p.split(":");
          return { label: label || "Phone", number: rest.join(":") || "" };
        })
      : [];

    const precincts = cols[9]
      ? cols[9].split("|").filter(Boolean)
      : [];

    const statuses: { key: string; value: boolean }[] = milestoneKeys.map((key, idx) => ({
      key,
      value: (cols[milestoneStartIdx + idx] || "").toUpperCase() === "TRUE",
    }));

    parsed.push({
      pollId: cols[0] || null,
      name: cols[1] || "Unknown",
      address: cols[2] || "",
      city: cols[3] || "",
      state: cols[4] || "OH",
      zoneId,
      contactName: cols[6] || "",
      contactTitle: cols[7] || "",
      phones,
      precincts,
      statuses,
    });
  }

  if (parsed.length === 0) {
    return NextResponse.json({ error: "No valid rows in CSV" }, { status: 400 });
  }

  // Restore in a transaction
  await db.$transaction(async (tx) => {
    // Wipe current data
    await tx.locationStatus.deleteMany();
    await tx.contact.deleteMany();
    await tx.precinct.deleteMany();
    await tx.location.deleteMany();

    // Re-create from CSV
    for (const row of parsed) {
      const loc = await tx.location.create({
        data: {
          pollId: row.pollId,
          name: row.name,
          address: row.address,
          city: row.city,
          state: row.state,
          zoneId: row.zoneId,
        },
      });

      // Contacts
      if (row.contactName) {
        await tx.contact.create({
          data: {
            locationId: loc.id,
            name: row.contactName,
            title: row.contactTitle,
            phones: row.phones,
          },
        });
      }

      // Precincts
      if (row.precincts.length > 0) {
        await tx.precinct.createMany({
          data: row.precincts.map((label) => ({
            locationId: loc.id,
            wardName: "",
            label,
          })),
        });
      }

      // Statuses
      const statusData = row.statuses
        .map((s) => {
          const mId = milestoneMap.get(s.key);
          if (!mId) return null;
          return {
            locationId: loc.id,
            milestoneId: mId,
            value: s.value,
          };
        })
        .filter(Boolean) as { locationId: number; milestoneId: number; value: boolean }[];

      if (statusData.length > 0) {
        await tx.locationStatus.createMany({ data: statusData });
      }
    }
  });

  // Audit
  await db.auditLog.create({
    data: {
      locationId: 0,
      field: "csv_restore",
      oldValue: null,
      newValue: `Restored from CSV: ${file.name} (${parsed.length} locations)`,
      userId: session.userId,
    },
  });

  broadcast({ type: "location_change" });

  return NextResponse.json({ success: true, count: parsed.length });
});

// Simple CSV line parser that handles quoted fields
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}
