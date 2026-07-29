// De-duplicate audit rows created by the old double-fire toggle bug.
//
// A single bubble click used to fire two identical toggle requests, writing
// two audit rows with the same location + status + direction + user within a
// second or two. This collapses each such burst to a single row.
//
// SAFE BY DEFAULT: dry run (reports only). Add --apply to actually delete.
//   cd ~/GreenBubbleV2 && node scripts/dedupe-audit.js          # preview
//   cd ~/GreenBubbleV2 && node scripts/dedupe-audit.js --apply   # delete
//
// Only affects field = milestone_* (board toggles). A legitimate reverse
// (green->red) requires a typed reason, so two same-direction toggles within
// the window are always the bug, never real user actions.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const THRESHOLD_MS = 3000;

async function main() {
  const rows = await prisma.auditLog.findMany({
    where: { field: { startsWith: "milestone_" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, locationId: true, field: true, oldValue: true, newValue: true, userId: true, createdAt: true },
  });

  // Group by identical (location, status, direction, user).
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.locationId}|${r.field}|${r.oldValue}|${r.newValue}|${r.userId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const toDelete = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.createdAt - b.createdAt);
    let lastKept = null;
    for (const r of list) {
      if (lastKept && r.createdAt.getTime() - lastKept.getTime() <= THRESHOLD_MS) {
        toDelete.push(r.id); // duplicate within window — collapse
      } else {
        lastKept = r.createdAt; // keep this one
      }
    }
  }

  console.log(`Milestone toggle audit rows:     ${rows.length}`);
  console.log(`Duplicate rows to remove:        ${toDelete.length}`);
  console.log(`Rows remaining after cleanup:    ${rows.length - toDelete.length}`);

  if (!APPLY) {
    console.log(`\nDRY RUN — nothing deleted. Re-run with --apply to remove the duplicates.`);
    console.log(`(Recommended: back up first — e.g. sudo -u postgres pg_dump greenbubble > ~/greenbubble-backup.sql)`);
  } else {
    const chunk = 500;
    for (let i = 0; i < toDelete.length; i += chunk) {
      await prisma.auditLog.deleteMany({ where: { id: { in: toDelete.slice(i, i + chunk) } } });
    }
    console.log(`\nDeleted ${toDelete.length} duplicate rows.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
