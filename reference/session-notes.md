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

*Last updated: 2026-02-27*