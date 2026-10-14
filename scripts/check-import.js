// Quick read-only check of imported location/precinct data.
//   cd ~/GreenBubbleV2 && git pull && node scripts/check-import.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const locs = await prisma.location.count();
  const precs = await prisma.precinct.count();
  const withPrec = await prisma.location.count({ where: { precincts: { some: {} } } });

  console.log("=== Data check ===");
  console.log("Locations:", locs);
  console.log("Precincts total:", precs);
  console.log("Locations with >=1 precinct:", withPrec, "/", locs);

  // Zone distribution
  const byZone = await prisma.location.groupBy({ by: ["zoneId"], _count: true });
  console.log("Locations per zone (zoneId):", byZone.map((z) => `${z.zoneId}:${z._count}`).join("  "));

  // Sample a few
  for (const pid of ["8133", "7470", "8251"]) {
    const s = await prisma.location.findUnique({ where: { pollId: pid }, include: { precincts: true, zone: true } });
    if (s) {
      console.log(`\n${pid}: ${s.name} | zone ${s.zone?.number} | ${s.city}`);
      console.log(`  precincts (${s.precincts.length}): ${s.precincts.map((p) => p.label).join(", ") || "(none)"}`);
    } else {
      console.log(`\n${pid}: NOT FOUND`);
    }
  }

  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
