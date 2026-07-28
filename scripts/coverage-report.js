// Test-session coverage report (filtered to one Eastern calendar day).
//
// Reproduces the worksheet assignments (first SHEETS*3 locations A-Z) and, for
// each, checks how many of its 7 status bubbles were toggled at least once
// DURING THE TARGET DAY (from the audit log). Coverage is location+milestone
// based, so the shared-name attribution glitch does not affect it.
//
// Run on the server:
//   cd ~/GreenBubbleV2 && node scripts/coverage-report.js [YYYY-MM-DD] [sheets]
//   defaults: date = 2026-07-28, sheets = 30   (each sheet = 3 locations)

const { PrismaClient } = require("@prisma/client");
const Papa = require("papaparse");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const PER = 3;
const TARGET_DATE = process.argv[2] || "2026-07-28"; // Eastern calendar day
const SHEETS = Number(process.argv[3]) || 30;

// Format a UTC-stored timestamp as its Eastern calendar date (YYYY-MM-DD), DST-safe.
const easternDate = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

async function main() {
  const csv = fs.readFileSync(
    path.join(process.cwd(), "reference", "gis-data", "Polls_Elec_264.csv"),
    "utf8"
  );
  const names = [
    ...new Set(
      Papa.parse(csv, { header: true, skipEmptyLines: true })
        .data.map((r) => (r.location_line_1 || "").trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));
  const assigned = names.slice(0, SHEETS * PER);
  const assignedIds = new Set();

  const milestones = await prisma.statusMilestone.findMany({ orderBy: { displayOrder: "asc" } });
  const allFields = milestones.map((m) => `milestone_${m.id}`);
  const msLabel = new Map(milestones.map((m) => [`milestone_${m.id}`, m.label]));

  const locs = await prisma.location.findMany({ select: { id: true, name: true } });
  const byName = new Map(locs.map((l) => [l.name, l]));
  const nameById = new Map(locs.map((l) => [l.id, l.name]));
  assigned.forEach((n) => { const l = byName.get(n); if (l) assignedIds.add(l.id); });

  // All bubble toggles, then keep only those on the target Eastern day.
  const audits = await prisma.auditLog.findMany({
    where: { field: { startsWith: "milestone_" } },
    select: { locationId: true, field: true, createdAt: true },
  });
  const dayAudits = audits.filter((a) => easternDate(a.createdAt) === TARGET_DATE);

  const touched = new Map(); // locationId -> Set(field)
  for (const a of dayAudits) {
    if (a.locationId == null) continue;
    if (!touched.has(a.locationId)) touched.set(a.locationId, new Set());
    touched.get(a.locationId).add(a.field);
  }

  let complete = 0, partial = 0, untouched = 0, missing = 0;
  const lines = [];
  assigned.forEach((name, i) => {
    const pc = Math.floor(i / PER) + 1;
    const slot = String.fromCharCode(65 + (i % PER));
    const tag = `PC${String(pc).padStart(2, "0")}${slot}`;
    const l = byName.get(name);
    if (!l) { missing++; lines.push(`${tag}  --   NOT-IN-DB   ${name}`); return; }
    const done = touched.get(l.id) || new Set();
    const n = allFields.filter((f) => done.has(f)).length;
    let status;
    if (n === 0) { status = "UNTOUCHED"; untouched++; }
    else if (n >= allFields.length) { status = "COMPLETE "; complete++; }
    else { status = "PARTIAL  "; partial++; }
    const miss =
      n > 0 && n < allFields.length
        ? "  missing: " + allFields.filter((f) => !done.has(f)).map((f) => msLabel.get(f)).join(", ")
        : "";
    lines.push(`${tag}  ${n}/${allFields.length}  ${status}  ${name}${miss}`);
  });

  // Off-script: locations touched on the day that were NOT in the assigned set.
  const offScript = [...touched.keys()].filter((id) => !assignedIds.has(id));

  console.log(`=== Coverage for ${TARGET_DATE} (Eastern), ${SHEETS} sheets ===\n`);
  lines.forEach((l) => console.log(l));
  console.log(
    `\nSummary: COMPLETE=${complete}  PARTIAL=${partial}  UNTOUCHED=${untouched}  NOT_IN_DB=${missing}`
  );
  console.log(
    `Totals on ${TARGET_DATE}: ${dayAudits.length} bubble actions across ` +
      `${touched.size} distinct locations (${offScript.length} of them OUTSIDE the assigned set).`
  );
  if (offScript.length) {
    console.log(`\nOff-script locations touched (not on any worksheet):`);
    offScript.forEach((id) =>
      console.log(`  ${touched.get(id).size}/${allFields.length}  ${nameById.get(id) || "id " + id}`)
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
