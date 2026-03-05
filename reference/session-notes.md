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

*Last updated: 2026-03-05*