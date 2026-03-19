import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";
import { broadcast } from "@/lib/events";
import * as XLSX from "xlsx";

interface FileResult {
  name: string;
  type: string;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// Header signatures for auto-detection (order matters — most specific first)
const SIGNATURES: Record<string, (headers: string[]) => boolean> = {
  // Polls_Elec — has lat/lng/city/precincts (the richest GIS file)
  polls_elec: (h) => h.includes("latitude") && h.includes("longitude") && h.includes("precincts"),
  // VLM / Coordinator combo sheet — has poll code + zone + VLM + phones (locations + contacts in one)
  vlm_combo: (h) => h.includes("poll code") && h.includes("vlm") && h.includes("zone"),
  // Poll_Locations — simpler: poll_id, location_line_1, zone
  poll_locations: (h) => h.includes("location_line_1") && h.includes("zone") && !h.includes("latitude"),
  // Precincts_List — poll_id, precinct_id, municipal, label
  precincts_list: (h) => h.includes("precinct_id") && h.includes("municipal") && h.includes("label"),
  // Coordinator contact sheet (contacts only — no zone column)
  contacts: (h) => (h.includes("vlm") || h.includes("vlm cell phone")) && h.includes("poll code") && !h.includes("zone"),
  // SMS phone assignments — poll_id + sms_phone (or phone)
  sms_phones: (h) => (h.includes("sms_phone") || h.includes("phone")) && (h.includes("poll_id") || h.includes("poll code")) && !h.includes("vlm"),
  // Legacy logins — username, password, role
  accounts: (h) => h.includes("username") && h.includes("password") && h.includes("role"),
};

// POST — auto-detect and import multiple files
export const POST = withRole("ADMIN", async (req, { session }) => {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json({ error: `Failed to read form data: ${err instanceof Error ? err.message : "unknown"}` }, { status: 400 });
  }

  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Parse all files into { name, type, rows }
  const parsed: { name: string; type: string; rows: Record<string, string>[] }[] = [];

  for (const file of files) {
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) continue;

      const headers = Object.keys(rows[0]);
      let detectedType = "unknown";

      for (const [type, check] of Object.entries(SIGNATURES)) {
        if (check(headers)) {
          detectedType = type;
          break;
        }
      }

      parsed.push({ name: file.name, type: detectedType, rows });
    } catch (err) {
      return NextResponse.json({ error: `Failed to parse ${file.name}: ${err instanceof Error ? err.message : "unknown"}` }, { status: 400 });
    }
  }

  // Process in dependency order: locations first, then precincts, then contacts, then accounts
  const order = ["polls_elec", "vlm_combo", "poll_locations", "precincts_list", "contacts", "sms_phones", "accounts"];
  parsed.sort((a, b) => {
    const ai = order.indexOf(a.type);
    const bi = order.indexOf(b.type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const results: FileResult[] = [];

  for (const entry of parsed) {
    let result: { created: number; updated: number; skipped: number; errors: string[] };

    if (entry.type === "polls_elec" || entry.type === "poll_locations") {
      result = await importLocations(entry.rows);
    } else if (entry.type === "vlm_combo") {
      result = await importVlmCombo(entry.rows);
    } else if (entry.type === "precincts_list") {
      result = await importPrecincts(entry.rows);
    } else if (entry.type === "contacts") {
      result = await importContacts(entry.rows);
    } else if (entry.type === "sms_phones") {
      result = await importSmsPhones(entry.rows);
    } else if (entry.type === "accounts") {
      result = await importAccounts(entry.rows);
    } else {
      result = { created: 0, updated: 0, skipped: entry.rows.length, errors: [`Could not detect file type from headers`] };
    }

    results.push({ name: entry.name, type: entry.type, ...result });

    // Log each import
    await db.importLog.create({
      data: {
        fileType: entry.type,
        fileName: entry.name,
        rowCount: entry.rows.length,
        status: result.errors.length > 0 ? "partial" : "success",
        errors: result.errors.length > 0 ? result.errors : undefined,
        userId: session.userId,
      },
    });

    await db.auditLog.create({
      data: {
        field: `import_${entry.type}`,
        newValue: `${entry.name}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
        userId: session.userId,
      },
    });
  }

  const hasLocationChanges = results.some((r) => r.type !== "accounts" && r.type !== "unknown");
  if (hasLocationChanges) {
    broadcast({ type: "location_change" });
  }

  return NextResponse.json({ results });
});

// --- File parsing (CSV + XLSX) ---

async function parseFile(file: File): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(ws);
    return csvToRows(csv);
  }

  // CSV or TAB
  const text = await file.text();
  return csvToRows(text);
}

function csvToRows(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] || "").trim(); });
    return row;
  }).filter((row) => Object.values(row).some((v) => v));
}

// --- Location Import (Polls_Elec or Poll_Locations) ---
// Smart merge: only overwrites fields the file actually has data for.
// If zone is missing (e.g. Polls_Elec), still updates existing locations or skips new ones.

async function importLocations(rows: Record<string, string>[]) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  // Ensure zones 1-6 exist
  for (let i = 1; i <= 6; i++) {
    await db.zone.upsert({
      where: { number: i },
      create: { number: i, name: `Zone ${i}` },
      update: {},
    });
  }
  const zones = await db.zone.findMany();
  const zoneByNumber = new Map(zones.map((z) => [z.number, z.id]));
  const milestones = await db.statusMilestone.findMany();

  // Detect which columns this file actually has
  const sampleRow = rows[0] || {};
  const hasZone = "zone" in sampleRow;
  const hasCity = "city" in sampleRow || "poll_addr3" in sampleRow;
  const hasLatLng = "latitude" in sampleRow;
  const hasPrecincts = "precincts" in sampleRow;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pollId = row["poll_id"] || row["poll code"] || "";
    const name = row["location_line_1"] || row["poll_name"] || "";
    const address = row["location_line_2"] || row["poll_addr1"] || "";
    const city = row["city"] || row["poll_addr3"] || "";
    const zoneNum = hasZone ? parseInt(row["zone"] || "0") : 0;
    const lat = hasLatLng ? (parseFloat(row["latitude"] || "") || null) : null;
    const lng = hasLatLng ? (parseFloat(row["longitude"] || "") || null) : null;
    const precinctStr = hasPrecincts ? (row["precincts"] || "") : "";

    if (!pollId || !name) {
      result.errors.push(`Row ${i + 2}: Missing poll_id or name`);
      result.skipped++;
      continue;
    }

    const zoneId = hasZone ? zoneByNumber.get(zoneNum) : null;

    try {
      const existing = await db.location.findUnique({ where: { pollId } });

      if (existing) {
        // Only update fields this file actually provides
        const data: Record<string, unknown> = {};
        if (name) data.name = name;
        if (address) data.address = address;
        if (hasCity && city) data.city = city;
        if (zoneId) data.zoneId = zoneId;
        if (lat !== null) data.lat = lat;
        if (lng !== null) data.lng = lng;

        if (Object.keys(data).length > 0) {
          await db.location.update({ where: { id: existing.id }, data });
        }
        if (precinctStr) await syncPrecincts(existing.id, precinctStr, city || existing.city);
        result.updated++;
      } else {
        // For new locations, we need a zone — silently skip if this file doesn't have zones
        // (another file like VLM combo or Poll_Locations will create them)
        if (!zoneId) {
          result.skipped++;
          continue;
        }

        const location = await db.location.create({
          data: { pollId, name, address, city, zoneId, lat, lng },
        });
        if (milestones.length > 0) {
          await db.locationStatus.createMany({
            data: milestones.map((m) => ({ locationId: location.id, milestoneId: m.id, value: false })),
          });
        }
        if (precinctStr) await syncPrecincts(location.id, precinctStr, city);
        result.created++;
      }
    } catch (err) {
      result.errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Unknown error"}`);
      result.skipped++;
    }
  }

  return result;
}

// --- VLM Combo Import (coordinator sheet with locations + contacts in one) ---
// Columns: POLL CODE, ZONE, AV#, POLL_NAME, POLL_ADDR1, POLL_ADDR3, POLL_ZIP, VLM, VLM CELL PHONE, BOE CELL PHONE, LANDLINE, IS PHONE NUMBER

async function importVlmCombo(rows: Record<string, string>[]) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  // Ensure zones 1-6 exist
  for (let i = 1; i <= 6; i++) {
    await db.zone.upsert({
      where: { number: i },
      create: { number: i, name: `Zone ${i}` },
      update: {},
    });
  }
  const zones = await db.zone.findMany();
  const zoneByNumber = new Map(zones.map((z) => [z.number, z.id]));
  const milestones = await db.statusMilestone.findMany();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pollId = row["poll code"] || "";
    const name = row["poll_name"] || "";
    const address = row["poll_addr1"] || "";
    const city = row["poll_addr3"] || "";
    const zoneNum = parseInt(row["zone"] || "0");
    const vlmName = row["vlm"] || "";

    if (!pollId || !name) {
      result.errors.push(`Row ${i + 2}: Missing poll code or name`);
      result.skipped++;
      continue;
    }

    const zoneId = zoneByNumber.get(zoneNum);
    if (!zoneId) {
      result.errors.push(`Row ${i + 2}: Invalid zone ${zoneNum} for ${name}`);
      result.skipped++;
      continue;
    }

    // Build phones
    const phones: { label: string; number: string }[] = [];
    const vlmCell = row["vlm cell phone"] || "";
    const boeCell = row["boe cell phone"] || "";
    const landline = row["landline"] || "";
    const isPhone = row["is phone number"] || "";
    if (vlmCell) phones.push({ label: "VLM Cell", number: formatPhone(vlmCell) });
    if (boeCell) phones.push({ label: "BOE Cell", number: formatPhone(boeCell) });
    if (landline) phones.push({ label: "Landline", number: formatPhone(landline) });
    if (isPhone && isPhone !== boeCell && isPhone !== landline) {
      phones.push({ label: "IS Phone", number: formatPhone(isPhone) });
    }

    try {
      const existing = await db.location.findUnique({ where: { pollId } });

      if (existing) {
        // Update location
        await db.location.update({
          where: { id: existing.id },
          data: { name, address, city, zoneId },
        });

        // Upsert contact
        const existingContact = await db.contact.findFirst({ where: { locationId: existing.id } });
        if (existingContact) {
          await db.contact.update({
            where: { id: existingContact.id },
            data: { name: vlmName || existingContact.name, title: "VLM", phones: phones.length > 0 ? phones : undefined },
          });
        } else if (vlmName) {
          await db.contact.create({
            data: { locationId: existing.id, name: vlmName, title: "VLM", phones },
          });
        }

        result.updated++;
      } else {
        // Create location
        const location = await db.location.create({
          data: { pollId, name, address, city, zoneId },
        });

        // Create default statuses
        if (milestones.length > 0) {
          await db.locationStatus.createMany({
            data: milestones.map((m) => ({ locationId: location.id, milestoneId: m.id, value: false })),
          });
        }

        // Create contact
        if (vlmName) {
          await db.contact.create({
            data: { locationId: location.id, name: vlmName, title: "VLM", phones },
          });
        }

        result.created++;
      }
    } catch (err) {
      result.errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Unknown error"}`);
      result.skipped++;
    }
  }

  return result;
}

// --- Precincts Import (Precincts_List) ---

async function importPrecincts(rows: Record<string, string>[]) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pollId = row["poll_id"] || "";
    const label = row["label"] || "";
    const municipal = row["municipal"] || "";

    if (!pollId || !label) {
      result.skipped++;
      continue;
    }

    const location = await db.location.findUnique({ where: { pollId } });
    if (!location) {
      result.errors.push(`Row ${i + 2}: Location ${pollId} not found`);
      result.skipped++;
      continue;
    }

    try {
      // Check if this precinct already exists
      const existing = await db.precinct.findFirst({
        where: { locationId: location.id, label },
      });

      if (existing) {
        result.skipped++;
      } else {
        await db.precinct.create({
          data: { locationId: location.id, wardName: municipal, label },
        });
        result.created++;
      }
    } catch (err) {
      result.errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Unknown error"}`);
      result.skipped++;
    }
  }

  return result;
}

// --- Contact Import (Coordinator sheet) ---

async function importContacts(rows: Record<string, string>[]) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pollId = row["poll code"] || row["poll_id"] || "";
    const vlmName = row["vlm"] || "";

    if (!pollId) {
      result.errors.push(`Row ${i + 2}: Missing poll code`);
      result.skipped++;
      continue;
    }

    const location = await db.location.findUnique({ where: { pollId } });
    if (!location) {
      result.errors.push(`Row ${i + 2}: Location ${pollId} not found`);
      result.skipped++;
      continue;
    }

    const phones: { label: string; number: string }[] = [];
    const vlmCell = row["vlm cell phone"] || "";
    const boeCell = row["boe cell phone"] || "";
    const landline = row["landline"] || "";
    const isPhone = row["is phone number"] || "";

    if (vlmCell) phones.push({ label: "VLM Cell", number: formatPhone(vlmCell) });
    if (boeCell) phones.push({ label: "BOE Cell", number: formatPhone(boeCell) });
    if (landline) phones.push({ label: "Landline", number: formatPhone(landline) });
    if (isPhone && isPhone !== boeCell && isPhone !== landline) {
      phones.push({ label: "IS Phone", number: formatPhone(isPhone) });
    }

    try {
      const existing = await db.contact.findFirst({ where: { locationId: location.id } });

      if (existing) {
        await db.contact.update({
          where: { id: existing.id },
          data: { name: vlmName || existing.name, title: "VLM", phones: phones.length > 0 ? phones : undefined },
        });
        result.updated++;
      } else {
        await db.contact.create({
          data: { locationId: location.id, name: vlmName || "Unknown", title: "VLM", phones },
        });
        result.created++;
      }
    } catch (err) {
      result.errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Unknown error"}`);
      result.skipped++;
    }
  }

  return result;
}

// --- SMS Phone Assignment Import ---
// CSV: poll_id (or poll code), sms_phone (or phone)

async function importSmsPhones(rows: Record<string, string>[]) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pollId = row["poll_id"] || row["poll code"] || "";
    const phone = row["sms_phone"] || row["phone"] || "";

    if (!pollId) { result.skipped++; continue; }

    const location = await db.location.findUnique({ where: { pollId } });
    if (!location) {
      result.errors.push(`Row ${i + 2}: Location ${pollId} not found`);
      result.skipped++;
      continue;
    }

    try {
      if (phone) {
        const normalized = phone.replace(/\D/g, "").slice(-10);
        const allAssigned = await db.location.findMany({
          where: { smsPhone: { not: null }, id: { not: location.id } },
        });
        const dupe = allAssigned.find(
          (l) => l.smsPhone && l.smsPhone.replace(/\D/g, "").slice(-10) === normalized
        );
        if (dupe) {
          result.errors.push(`Row ${i + 2}: ${phone} already assigned to ${dupe.name} (${dupe.pollId})`);
          result.skipped++;
          continue;
        }
      }
      await db.location.update({
        where: { id: location.id },
        data: { smsPhone: phone || null },
      });
      result.updated++;
    } catch (err) {
      result.errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Unknown error"}`);
      result.skipped++;
    }
  }

  return result;
}

// --- Account Import (Legacy logins) ---

async function importAccounts(rows: Record<string, string>[]) {
  const { hash } = await import("bcryptjs");
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

  const roleMap: Record<string, string> = {
    manager: "SUPERVISOR", admin: "ADMIN", supervisor: "SUPERVISOR",
    captain: "ZONE_CAPTAIN", "zone captain": "ZONE_CAPTAIN",
    operator: "PHONE_OPERATOR", "phone operator": "PHONE_OPERATOR",
    viewer: "VIEWER",
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const username = row["username"] || "";
    const password = row["password"] || "";
    const roleRaw = (row["role"] || "").toLowerCase();

    if (!username || !password) { result.skipped++; continue; }

    const role = roleMap[roleRaw];
    if (!role) {
      result.errors.push(`Row ${i + 2}: Unknown role "${roleRaw}" for ${username}`);
      result.skipped++;
      continue;
    }

    try {
      const existing = await db.user.findFirst({ where: { displayName: username } });
      if (existing) { result.skipped++; continue; }

      const pinHash = await hash(password, 10);
      await db.user.create({
        data: {
          displayName: username,
          pinHash,
          role: role as "ADMIN" | "SUPERVISOR" | "ZONE_CAPTAIN" | "PHONE_OPERATOR" | "VIEWER",
          pinMode: "named",
          active: true,
        },
      });
      result.created++;
    } catch (err) {
      result.errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Unknown error"}`);
      result.skipped++;
    }
  }

  return result;
}

// --- Helpers ---

async function syncPrecincts(locationId: number, precinctStr: string, city: string) {
  const labels = precinctStr.split(/\s+/).filter(Boolean);
  await db.precinct.deleteMany({ where: { locationId } });
  if (labels.length > 0) {
    await db.precinct.createMany({
      data: labels.map((label) => ({ locationId, wardName: city || "", label })),
    });
  }
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return raw;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { result.push(current); current = ""; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}
