// Rename status milestone labels. Run on the server:
//   cd ~/GreenBubbleV2 && git pull && node scripts/rename-milestones.js
//
// Matches each rule against the CURRENT label (case-insensitive) and updates
// it. Safe + idempotent: only matching rows change, and it prints before/after
// plus any rule that matched nothing (so we can fix the pattern if a current
// label is worded differently than expected). No rebuild/restart needed —
// labels are data; refresh the board to see them.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const RULES = [
  { test: /mon.*staff.*arriv/i,        to: "Monday Night Arrival" },
  { test: /mon.*(bldg|build).*clos/i,  to: "Monday Close" },
  { test: /tue.*staff.*arriv/i,        to: "Tuesday Arrival" },
  { test: /tue.*poll.*open/i,          to: "Tuesday Open and Ready" },
  { test: /tue.*poll.*clos/i,          to: "Tuesday Close Poll Ready" },
];

async function main() {
  const before = await prisma.statusMilestone.findMany({ orderBy: { displayOrder: "asc" } });
  console.log("\n=== BEFORE ===");
  before.forEach((m) => console.log(`  [${m.displayOrder}] ${m.label}`));

  const used = new Set();
  let changed = 0;
  for (const m of before) {
    const rule = RULES.find((r) => r.test.test(m.label));
    if (!rule) continue;
    used.add(rule);
    if (m.label !== rule.to) {
      await prisma.statusMilestone.update({ where: { id: m.id }, data: { label: rule.to } });
      console.log(`  RENAME: "${m.label}"  ->  "${rule.to}"`);
      changed++;
    }
  }

  const after = await prisma.statusMilestone.findMany({ orderBy: { displayOrder: "asc" } });
  console.log("\n=== AFTER ===");
  after.forEach((m) => console.log(`  [${m.displayOrder}] ${m.label}`));

  const unmatched = RULES.filter((r) => !used.has(r));
  if (unmatched.length) {
    console.log("\n! These rules matched NO current label — check the BEFORE list above and send Claude the exact wording:");
    unmatched.forEach((r) => console.log(`    intended -> "${r.to}"  (pattern ${r.test})`));
  }

  console.log(`\nDone. ${changed} label(s) changed.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
