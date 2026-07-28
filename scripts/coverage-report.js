// Test-session coverage report.
// Recomputes the exact worksheet assignments (first N*3 locations A-Z) and,
// for each, checks how many of its 7 status bubbles were toggled at least once
// during testing (from the audit log). Attribution names don't matter here —
// coverage is based on location + milestone, so the shared-name glitch is a non-issue.
//
// Run on the server:  cd ~/GreenBubbleV2 && node scripts/coverage-report.js [sheets]
//   sheets = number of worksheets handed out (default 50). Each sheet = 3 locations.

const { PrismaClient } = require("@prisma/client");
const Papa = require("papaparse");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const PER = 3;
const SHEETS = Number(process.argv[2]) || 50;

async function main() {
  // Reproduce the worksheet assignment: unique location names, sorted A-Z.
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

  const milestones = await prisma.statusMilestone.findMany({ orderBy: { displayOrder: "asc" } });
  const allFields = milestones.map((m) => `milestone_${m.id}`);
  const msLabel = new Map(milestones.map((m) => [`milestone_${m.id}`, m.label]));

  const locs = await prisma.location.findMany({ select: { id: true, name: true } });
  const byName = new Map(locs.map((l) => [l.name, l]));

  // Every bubble toggle recorded in the audit log (field = milestone_<id>).
  const audits = await prisma.auditLog.findMany({
    where: { field: { startsWith: "milestone_" } },
    select: { locationId: true, field: true },
  });
  const touched = new Map(); // locationId -> Set(field)
  for (const a of audits) {
    if (a.locationId == null) continue;
    if (!touched.has(a.locationId)) touched.set(a.locationId, new Set());
    touched.get(a.locationId).add(a.field);
  }

  let complete = 0, partial = 0, untouched = 0, missing = 0;
  const lines = [];
  assigned.forEach((name, i) => {
    const pc = Math.floor(i / PER) + 1;
    const slot = String.fromCharCode(65 + (i % PER)); // A/B/C
    const tag = `PC${String(pc).padStart(2, "0")}${slot}`;
    const l = byName.get(name);
    if (!l) {
      missing++;
      lines.push(`${tag}  --   NOT-IN-DB   ${name}`);
      return;
    }
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

  lines.forEach((l) => console.log(l));
  console.log(
    `\nSummary (${assigned.length} assigned locations across ${SHEETS} sheets):` +
      `  COMPLETE=${complete}  PARTIAL=${partial}  UNTOUCHED=${untouched}  NOT_IN_DB=${missing}`
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
