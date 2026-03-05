import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // --- Zones (6 zones matching legacy) ---
  const zones = await Promise.all(
    [
      { number: 1, name: "Zone 1" },
      { number: 2, name: "Zone 2" },
      { number: 3, name: "Zone 3" },
      { number: 4, name: "Zone 4" },
      { number: 5, name: "Zone 5" },
      { number: 6, name: "Zone 6" },
    ].map((z) =>
      prisma.zone.upsert({
        where: { number: z.number },
        update: {},
        create: z,
      })
    )
  );
  console.log(`  ${zones.length} zones`);

  // --- Status Milestones (7 default, matching legacy) ---
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

  // --- Sample Locations (20 real locations from election 264 data) ---
  const sampleLocations = [
    { name: "Abraham Lincoln Elementary School", address: "6009 Dunham Road", city: "Maple Hts", zone: 3, lat: 41.3969, lng: -81.5733 },
    { name: "Advent Lutheran Church Solon", address: "5525 Harper Road", city: "Solon", zone: 3, lat: 41.4089, lng: -81.4661 },
    { name: "Almira K-8 School", address: "3375 West 99th Street", city: "Cleveland", zone: 4, lat: 41.4618, lng: -81.7517 },
    { name: "Ambleside Towers Apartments", address: "2190 Ambleside Drive", city: "Cleveland", zone: 2, lat: 41.4986, lng: -81.6048 },
    { name: "American Legion Post 572", address: "6483 State Road", city: "Parma", zone: 5, lat: 41.3878, lng: -81.7103 },
    { name: "American Legion Post 738", address: "19311 Lorain Road", city: "Fairview Park", zone: 6, lat: 41.4516, lng: -81.8339 },
    { name: "Andrew J Rickoff Pre K-8 School", address: "3500 East 147th Street", city: "Cleveland", zone: 3, lat: 41.4635, lng: -81.5795 },
    { name: "Anton Grdina Elementary School", address: "2955 East 71st Street", city: "Cleveland", zone: 4, lat: 41.4785, lng: -81.6389 },
    { name: "Bay Village Community House", address: "303 Cahoon Road", city: "Bay Village", zone: 1, lat: 41.4845, lng: -81.9226 },
    { name: "Bedford High School", address: "481 Northfield Road", city: "Bedford", zone: 2, lat: 41.3933, lng: -81.5322 },
    { name: "Berea City Hall", address: "11 Berea Commons", city: "Berea", zone: 5, lat: 41.3694, lng: -81.8543 },
    { name: "Brecksville Community Center", address: "1 Community Drive", city: "Brecksville", zone: 2, lat: 41.3183, lng: -81.6268 },
    { name: "Brooklyn Senior Center", address: "7727 Memphis Avenue", city: "Brooklyn", zone: 5, lat: 41.4396, lng: -81.7411 },
    { name: "Garfield Heights Civic Center", address: "5407 Turney Road", city: "Garfield Hts", zone: 2, lat: 41.4200, lng: -81.6055 },
    { name: "Independence Civic Center", address: "6363 Selig Blvd", city: "Independence", zone: 5, lat: 41.3785, lng: -81.6380 },
    { name: "Lakewood Women's Pavilion", address: "14532 Lake Avenue", city: "Lakewood", zone: 6, lat: 41.4908, lng: -81.7988 },
    { name: "Middleburg Heights Community Center", address: "16000 Bagley Road", city: "Middleburg Hts", zone: 5, lat: 41.3780, lng: -81.8120 },
    { name: "North Olmsted Community Cabin", address: "28114 Lorain Road", city: "North Olmsted", zone: 6, lat: 41.4185, lng: -81.9237 },
    { name: "Strongsville Rec Center", address: "18100 Royalton Road", city: "Strongsville", zone: 1, lat: 41.3128, lng: -81.8387 },
    { name: "Westlake Porter Public Library", address: "27333 Center Ridge Road", city: "Westlake", zone: 6, lat: 41.4553, lng: -81.9177 },
  ];

  const zoneMap = Object.fromEntries(zones.map((z) => [z.number, z.id]));

  const locations = await Promise.all(
    sampleLocations.map((loc) =>
      prisma.location.create({
        data: {
          name: loc.name,
          address: loc.address,
          city: loc.city,
          state: "OH",
          lat: loc.lat,
          lng: loc.lng,
          zoneId: zoneMap[loc.zone],
        },
      })
    )
  );
  console.log(`  ${locations.length} locations`);

  // --- Create LocationStatus rows (one per location per milestone, all false) ---
  const statusRows = locations.flatMap((loc) =>
    createdMilestones.map((ms) => ({
      locationId: loc.id,
      milestoneId: ms.id,
      value: false,
    }))
  );
  await prisma.locationStatus.createMany({ data: statusRows });
  console.log(`  ${statusRows.length} status cells`);

  // --- Sample Precincts ---
  const samplePrecincts = [
    { locationIdx: 0, wardName: "Maple Heights", label: "1A" },
    { locationIdx: 0, wardName: "Maple Heights", label: "1B" },
    { locationIdx: 0, wardName: "Maple Heights", label: "2A" },
    { locationIdx: 1, wardName: "Solon", label: "5A" },
    { locationIdx: 1, wardName: "Solon", label: "5B" },
    { locationIdx: 1, wardName: "Solon", label: "5C" },
    { locationIdx: 2, wardName: "Cleveland", label: "11H" },
    { locationIdx: 2, wardName: "Cleveland", label: "12F" },
    { locationIdx: 3, wardName: "Cleveland", label: "6K" },
    { locationIdx: 8, wardName: "Bay Village", label: "1A" },
    { locationIdx: 8, wardName: "Bay Village", label: "1B" },
    { locationIdx: 8, wardName: "Bay Village", label: "1C" },
  ];
  await prisma.precinct.createMany({
    data: samplePrecincts.map((p) => ({
      locationId: locations[p.locationIdx].id,
      wardName: p.wardName,
      label: p.label,
    })),
  });
  console.log(`  ${samplePrecincts.length} precincts`);

  // --- Sample Contacts ---
  const sampleContacts = [
    { locationIdx: 0, firstName: "Jane", lastName: "Smith", type: "Presiding Judge", phone: "216-555-0101" },
    { locationIdx: 0, firstName: "Bob", lastName: "Jones", type: "Building Contact", phone: "216-555-0102" },
    { locationIdx: 1, firstName: "Maria", lastName: "Garcia", type: "Presiding Judge", phone: "440-555-0201" },
    { locationIdx: 4, firstName: "Tom", lastName: "Wilson", type: "Presiding Judge", phone: "440-555-0501" },
    { locationIdx: 8, firstName: "Linda", lastName: "Brown", type: "Presiding Judge", phone: "440-555-0901" },
    { locationIdx: 8, firstName: "Dave", lastName: "Lee", type: "Building Contact", phone: "440-555-0902" },
  ];
  await prisma.contact.createMany({
    data: sampleContacts.map((c) => ({
      locationId: locations[c.locationIdx].id,
      firstName: c.firstName,
      lastName: c.lastName,
      type: c.type,
      phone: c.phone,
    })),
  });
  console.log(`  ${sampleContacts.length} contacts`);

  // --- Default Users ---
  const adminPin = await hash("1234", 10);
  const superPin = await hash("5678", 10);
  const captainPin = await hash("1111", 10);
  const operatorPin = await hash("2222", 10);
  const viewerPin = await hash("3333", 10);

  await prisma.user.createMany({
    data: [
      { displayName: "Admin User", pinHash: adminPin, role: Role.ADMIN, active: true },
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
