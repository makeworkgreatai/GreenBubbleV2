# Session Notes: GreenBubble V2 Rebuild

> **Purpose:** Running notes to preserve context between work sessions. Read this first when resuming work.

---

## Session 1 — 2026-02-27

### What We Did
1. Analyzed the complete legacy codebase (uploaded as zip files):
   - Models (21 files) — EF6 Database-First with EDMX
   - Controllers (10 files) — ASP.NET Web API
   - Views (5 files) — Razor views (mostly boilerplate)
   - Hubs (1 file) — SignalR for real-time updates
   - Web.config — connection strings, auth config
   - IIS config (.vs folder)
   - README.txt — upload templates and role definitions

2. Created reference documentation folder with 4 documents:
   - `security-concerns.md` — 12 findings (3 critical, 4 high, 5 medium)
   - `current-features.md` — Complete feature inventory from source code
   - `system-analysis.md` — Deep technical analysis (DB schema, controllers, architecture)
   - `new-features.md` — PENDING COMMIT (16 planned features across 3 priority tiers)
   - `README.md` — Table of contents for reference folder

3. Key discoveries from code analysis:
   - App was built by developer named Reuben, left partially complete
   - Database hosted at GoDaddy (184.168.194.53)
   - 4 API endpoints have NO authentication at all
   - Hardcoded DB credentials in Web.config
   - SignalR broadcasts to ALL users (no scoping)
   - CSV import has zero input validation
   - LocTrackMain is a SQL VIEW that pre-joins data for the dashboard

### Important Corrections from User
- **Polling location count is NOT fixed at 271** — it changes every election cycle
- **The app is internal (BOE and temps only) BUT accessed externally** — users connect via MiFi hotspots and WiFi at polling locations, meaning the app traverses public/untrusted networks. This makes the lack of HTTPS and weak auth even more critical.

### What Is in the Repo (Committed)
- `reference/README.md` — Table of contents
- `reference/security-concerns.md` — 12 security findings
- `reference/current-features.md` — Legacy feature inventory
- `reference/system-analysis.md` — Technical deep dive

### What Still Needs to Be Committed
- `reference/new-features.md` — 16 planned features (content is ready, commit failed due to tool issue)

### Where We Left Off
- Reference folder is ~80% complete
- New features doc needs to be committed (content is drafted)
- User stepped away to do other work

### Next Steps When You Return
1. Commit `new-features.md` (I have the full content ready)
2. Review the open questions in new-features.md (hosting, tech stack, compliance)
3. Upload the SPA/frontend folder from the legacy app (we only have backend so far)
4. Upload any additional legacy files you can extract
5. Start making architecture decisions for the rebuild
6. Consider creating GitHub Issues from the new-features.md items

### Key Context to Remember
- This is a **Cuyahoga County Board of Elections** application
- Used on **election day** to track polling location readiness
- **~60 concurrent users** (10 full-time + ~50 temps)
- The number of polling locations **varies per election** (not fixed)
- Internal app but **accessed over external/untrusted networks** (MiFi, location WiFi)
- The "Green Bubble" name comes from the green status indicators on the dashboard
- 7 status columns track election day milestones (Monday Delivery through Close Poll Ready)
- You are the sole IT person managing this — the original developer is gone
- Security is extra important because it is public sector AND traverses untrusted networks

---

## Session 2 — 2026-03-05

### What We Did
1. Cloned GreenBubbleV2 repo locally to `C:\greenbubble\GreenBubbleV2\`
2. Confirmed legacy source code at `C:\greenbubble\LocationTracking-*` (not git repos, just extracted)
3. Confirmed real election CSV data at `C:\greenbubble\novgb\` (264 election, 271 locations)
4. Reviewed all 8 GitHub Issues (Phases 1-8) — plan is solid, decided to rebuild
5. Adopted FutureFlow methodology with 3 approval gates
6. Created `CLAUDE.md` in repo root with project context, conventions, and phase order
7. Scaffolded Phase 1 — complete Next.js 15 project:
   - `package.json` — all dependencies (Next.js 15, Prisma, Socket.IO, shadcn/ui, React-Leaflet, etc.)
   - `tsconfig.json` — TypeScript config with `@/*` path alias
   - `next.config.ts`, `postcss.config.mjs` — framework configs
   - `docker-compose.yml` — PostgreSQL 16 container
   - `.env.example` — documented environment variables
   - `.gitignore` — comprehensive ignore rules
   - `prisma/schema.prisma` — all 10 models (Zone, Location, StatusMilestone, LocationStatus, Contact, Precinct, User, AuditLog, ImportLog + Role enum)
   - `prisma/seed.ts` — 20 real locations from election 264 data, 7 milestones, 6 zones, 5 users with test PINs, sample precincts and contacts
   - `src/app/layout.tsx`, `page.tsx`, `globals.css` — base app with GreenBubble theme colors
   - `src/lib/db.ts` — Prisma singleton client
   - `src/lib/utils.ts` — cn() utility for shadcn/ui
   - `components.json` — shadcn/ui configuration
   - `src/app/api/health/route.ts` — DB health check endpoint

### Decisions Made
- **Rebuild confirmed** — legacy code is reference-only, not a codebase to extend
- **FutureFlow adopted** — GitHub Issues as persistent memory, 3 approval gates
- **Gate 1:** After Phase 1 — Docker + DB + seed works
- **Gate 2:** After Phase 3 — PIN login + dashboard + bubble toggling works
- **Gate 3:** After Phase 6 — audit export + data import lifecycle works
- **Leaflet over Google Maps** — free, no API key exposure
- **Issue numbering note:** Phase 1=#6, Phase 2=#7, Phase 3=#8, Phase 4=#1, Phase 5=#2, Phase 6=#3, Phase 7=#4, Phase 8=#5 (created in two batches)

### What Needs to Happen Next
1. Install Node.js 22 LTS on this machine
2. `cd C:\greenbubble\GreenBubbleV2 && npm install`
3. Install Docker Desktop (for PostgreSQL container)
4. `npm run docker:up` — start PostgreSQL
5. `cp .env.example .env` — create local env file
6. `npx prisma migrate dev --name init` — run initial migration
7. `npm run db:seed` — seed with sample data
8. `npm run dev` — start dev server
9. Visit `http://localhost:3000/api/health` — verify DB connection
10. Visit `http://localhost:3000` — see landing page
11. Commit all Phase 1 files and check off tasks in Issue #6

### Test PINs for Dev
| User | PIN | Role |
|------|-----|------|
| Admin User | 1234 | ADMIN |
| Supervisor | 5678 | SUPERVISOR |
| Zone 1 Captain | 1111 | ZONE_CAPTAIN |
| Phone Op | 2222 | PHONE_OPERATOR |
| Viewer | 3333 | VIEWER |

### Key Context (Carried Forward)
- Cuyahoga County Board of Elections
- ~60 concurrent users on election day
- Polling location count varies per election
- Accessed over untrusted networks (MiFi, public WiFi)
- You are the sole IT person
- Legacy dev (Reuben) is unreachable

---

## Session 3 — 2026-03-10 to 2026-03-12

### What We Did
1. **Phase 1 completed** — PostgreSQL 16 installed natively (no Docker, machine lacks VT-x), database seeded, health endpoint verified
2. **Phase 2 completed** — PIN-based auth with JWT sessions:
   - Login/logout/me API endpoints
   - Edge middleware protecting all routes
   - Three PIN modes: Individual (name-matched), Open (choose your name), Shared (one PIN per role)
   - PIN management UI with role selector, mode picker, print sheet
   - Impersonation guard (can't use a named account's name with a shared PIN)
   - Admin renamed to "GB Admin"
3. **Phase 3 in progress** — Dashboard bubble board:
   - GET /api/dashboard — returns locations + statuses + milestones (zone-scoped)
   - POST /api/locations/toggle-status — toggle bubble with audit logging
   - Unselect requires a reason (modal popup, saved to audit log)
   - Search, zone filter, sortable columns, progress summary row
   - Tooltips show location name + who updated + when
   - Address displayed under location name (single column)
   - Abbreviated milestone headers
4. **Schema changes:**
   - Contact model: merged firstName/lastName → single `name` field
   - Contact model: replaced rigid `type`+`phone` with `title` + `phones` JSON array (flexible labels)
   - User model: replaced `shared` boolean with `pinMode` string ("named"/"open"/"shared")

### Data Pipeline — How Election Data Flows
1. **GIS tech sends first** — locations with coordinates, precinct data
2. **Program coordinator sends second** — contact info (VLM names + phone numbers) to layer onto existing locations
3. **Coordinator contact sheet** saved to `reference/coordinator-contact-sheet.xlsx`
   - 271 rows, columns: POLL CODE, ZONE, AV#, POLL_NAME, POLL_ADDR1, POLL_ADDR3, POLL_ZIP, VLM, VLM CELL PHONE, BOE CELL PHONE, LANDLINE, IS PHONE NUMBER
   - Locations are already set up before contacts are imported
   - Contact import matches by POLL CODE to link contacts to locations

### Decisions Made
- **No Docker for local dev** — native PostgreSQL 16 (machine lacks VT-x for Hyper-V)
- **Shared PINs** — one PIN for a whole role, everyone types their own name
- **Open PINs** — each person gets own PIN, types whatever name they want
- **Unselect requires reason** — prevents accidental/unexplained status reversals
- **Flexible contact phones** — JSON array with freeform labels instead of rigid columns
- **Single name field** — handles "First Last", "First Middle Last", "First Last-Last" formats

### IVR Phone System (HIGH PRIORITY — before map)
- **Problem:** 271 locations calling in for basic status updates floods the phone lines. Calls should be reserved for actual issues.
- **Solution:** Twilio IVR — VLMs call a number, press a digit to update their status automatically
- **Flow:**
  1. VLM calls Twilio number from their assigned flip phone
  2. Caller ID matched to VLM Cell Phone in contacts → identifies location
  3. IVR menu: "Press 1 for Mon Delivery, 2 for Mon Arrival, 3 Mon Close, 4 Building Open, 5 Tue Arrival, 6 Open Ready, 7 Close Poll"
  4. System toggles milestone, confirms with voice: "Monday Delivery marked complete for [location name]"
  5. Dashboard updates in real-time
- **Tech:** Twilio (~$1/month number + ~$0.01/min = ~$20 per election day)
- **Caller ID matching:** VLM cell phones already stored in contacts table from coordinator sheet
- **Edge cases:** Unknown caller ID → prompt for poll ID manually, unrecognized → transfer to operator

### Map View Plan (Phase 8 — lower priority)
- Leaflet map with location pins, red (not done) → green (done) color scheme
- **Layer views** — one per milestone:
  - Mon Delivery, Mon Arrival, Mon Close, Building Open, Tue Arrival, Open Ready, Close Poll
- **Aggregate layers:**
  - Overall Monday (all Mon milestones combined)
  - Overall Tuesday (all Tue milestones combined)
  - Combined Mon + Tue overall
- Pins start red, turn green when status is marked done
- Easy to spot what's still outstanding at a glance

### Test PINs for Dev
| User | PIN | Role |
|------|-----|------|
| GB Admin | 1234 | ADMIN |
| Supervisor | 5678 | SUPERVISOR |
| Zone 1 Captain | 1111 | ZONE_CAPTAIN |
| Phone Op | 2222 | PHONE_OPERATOR |
| Viewer | 3333 | VIEWER |

---

*Last updated: 2026-03-12*