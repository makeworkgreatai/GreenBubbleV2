import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import Papa from "papaparse";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function readCsv<T>(filePath: string): T[] {
  const raw = fs.readFileSync(filePath, "utf8");
  return Papa.parse<T>(raw, { header: true, skipEmptyLines: true }).data;
}

async function main() {
  console.log("Seeding database with NOV 2025 General Election data...\n");

  // --- Zones (6 zones) ---
  const zones = await Promise.all(
    [1, 2, 3, 4, 5, 6].map((n) =>
      prisma.zone.upsert({
        where: { number: n },
        update: {},
        create: { number: n, name: `Zone ${n}` },
      })
    )
  );
  const zoneMap = Object.fromEntries(zones.map((z) => [z.number, z.id]));
  console.log(`  ${zones.length} zones`);

  // --- Status Milestones ---
  const milestones = [
    { key: "monday_delivery", label: "Monday Delivery", displayOrder: 1 },
    { key: "monday_arrival", label: "Monday Arrival", displayOrder: 2 },
    { key: "monday_close", label: "Monday Close", displayOrder: 3 },
    { key: "building_open", label: "Building Open", displayOrder: 4 },
    { key: "tuesday_arrival", label: "Tuesday Arrival", displayOrder: 5 },
    { key: "open_ready", label: "Open Ready", displayOrder: 6 },
    { key: "close_poll_ready", label: "Close Poll Ready", displayOrder: 7 },
  ];
  const createdMilestones = await Promise.all(
    milestones.map((m) =>
      prisma.statusMilestone.upsert({
        where: { key: m.key },
        update: {},
        create: m,
      })
    )
  );
  console.log(`  ${createdMilestones.length} milestones`);

  // --- Load CSV/XLSX data ---
  const refDir = path.join(__dirname, "..", "reference");

  // GIS: locations with coords + city + precincts (space-separated)
  const pollsElec = readCsv<{
    poll_id: string;
    status: string;
    Latitude: string;
    Longitude: string;
    location_line_1: string;
    location_line_2: string;
    city: string;
    Precincts: string;
  }>(path.join(refDir, "gis-data", "Polls_Elec_264.csv"));

  // GIS: zone mapping
  const pollLocs = readCsv<{
    poll_id: string;
    location_line_1: string;
    location_line_2: string;
    Zone: string;
  }>(path.join(refDir, "gis-data", "Poll_Locations_264.csv"));

  const pollZoneMap: Record<string, number> = {};
  pollLocs.forEach((p) => {
    pollZoneMap[p.poll_id] = parseInt(p.Zone);
  });

  // GIS: detailed precincts
  const precinctRows = readCsv<{
    Poll_id: string;
    precinct_id: string;
    Municipal: string;
    Label: string;
  }>(path.join(refDir, "gis-data", "Precincts_List_264.csv"));

  // Coordinator: contacts
  const wb = XLSX.readFile(path.join(refDir, "coordinator-contact-sheet.xlsx"));
  const contactRows = XLSX.utils.sheet_to_json<{
    "POLL CODE": number;
    ZONE: number;
    "AV#": number;
    POLL_NAME: string;
    POLL_ADDR1: string;
    POLL_ADDR3: string;
    POLL_ZIP: number;
    VLM: string;
    "VLM CELL PHONE": string;
    "BOE CELL PHONE": string;
    LANDLINE: string;
    "IS PHONE NUMBER": string;
  }>(wb.Sheets[wb.SheetNames[0]]);

  const contactByPollId: Record<string, (typeof contactRows)[0]> = {};
  contactRows.forEach((c) => {
    contactByPollId[String(c["POLL CODE"])] = c;
  });

  // --- Create Locations ---
  console.log(`  Creating ${pollsElec.length} locations...`);
  const locations: { id: number; pollId: string }[] = [];

  for (const poll of pollsElec) {
    const zoneNum = pollZoneMap[poll.poll_id];
    if (!zoneNum || !zoneMap[zoneNum]) continue;

    const loc = await prisma.location.create({
      data: {
        pollId: poll.poll_id,
        name: poll.location_line_1,
        address: poll.location_line_2,
        city: poll.city || "",
        state: "OH",
        lat: parseFloat(poll.Latitude) || null,
        lng: parseFloat(poll.Longitude) || null,
        zoneId: zoneMap[zoneNum],
      },
    });
    locations.push({ id: loc.id, pollId: poll.poll_id });
  }
  console.log(`  ${locations.length} locations`);

  // --- Location ID lookup ---
  const locByPollId: Record<string, number> = {};
  locations.forEach((l) => {
    locByPollId[l.pollId] = l.id;
  });

  // --- Create Status Cells (all false) ---
  const statusRows = locations.flatMap((loc) =>
    createdMilestones.map((ms) => ({
      locationId: loc.id,
      milestoneId: ms.id,
      value: false,
    }))
  );
  await prisma.locationStatus.createMany({ data: statusRows });
  console.log(`  ${statusRows.length} status cells`);

  // --- Create Precincts ---
  const precinctData = precinctRows
    .filter((p) => locByPollId[p.Poll_id])
    .map((p) => ({
      locationId: locByPollId[p.Poll_id],
      wardName: p.Municipal || "",
      label: p.Label,
    }));
  await prisma.precinct.createMany({ data: precinctData });
  console.log(`  ${precinctData.length} precincts`);

  // --- Create Contacts ---
  let contactCount = 0;
  for (const loc of locations) {
    const c = contactByPollId[loc.pollId];
    if (!c || !c.VLM) continue;

    const phones: { label: string; number: string }[] = [];
    const vlmCell = String(c["VLM CELL PHONE"] || "").trim();
    const boeCell = String(c["BOE CELL PHONE"] || "").trim();
    const landline = String(c["LANDLINE"] || "").trim();
    const isPhone = String(c["IS PHONE NUMBER"] || "").trim();

    if (vlmCell) phones.push({ label: "VLM Cell", number: vlmCell });
    if (boeCell) phones.push({ label: "BOE Cell", number: boeCell });
    if (landline) phones.push({ label: "Landline", number: landline });
    if (isPhone) phones.push({ label: "IS Phone", number: isPhone });

    await prisma.contact.create({
      data: {
        locationId: loc.id,
        name: c.VLM,
        title: "VLM",
        phones,
      },
    });
    contactCount++;
  }
  console.log(`  ${contactCount} contacts`);

  // --- Default Users ---
  const adminPin = await hash("1234", 10);
  const superPin = await hash("5678", 10);
  const captainPin = await hash("1111", 10);
  const operatorPin = await hash("2222", 10);
  const viewerPin = await hash("3333", 10);

  await prisma.user.createMany({
    data: [
      { displayName: "GB Admin", pinHash: adminPin, role: Role.ADMIN, active: true },
      { displayName: "Supervisor", pinHash: superPin, role: Role.SUPERVISOR, active: true },
      { displayName: "Zone 1 Captain", pinHash: captainPin, role: Role.ZONE_CAPTAIN, zoneId: zoneMap[1], active: true },
      { displayName: "Phone Op", pinHash: operatorPin, role: Role.PHONE_OPERATOR, active: true },
      { displayName: "Viewer", pinHash: viewerPin, role: Role.VIEWER, active: true },
    ],
  });
  console.log("  5 users (PINs: admin=1234, super=5678, captain=1111, operator=2222, viewer=3333)");

  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
