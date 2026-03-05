# GreenBubble V2

## What This Is

Election-day polling location tracking app for Cuyahoga County Board of Elections. Operators toggle status milestones (Monday Delivery, Building Open, etc.) for ~270 polling locations. ~60 concurrent users on election day. The "green bubbles" are the status indicators on the dashboard.

This is a **ground-up rebuild** of a legacy ASP.NET/AngularJS app. The original developer (Reuben) left years ago. The legacy code lives in `C:\greenbubble\LocationTracking-*` folders for reference only — do not modify it.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL via Prisma ORM
- **Real-time:** Socket.IO (zone-scoped rooms)
- **Auth:** PIN-based login with JWT, bcrypt-hashed PINs, role-based access control
- **Maps:** React-Leaflet + OpenStreetMap (not Google Maps)
- **Dev environment:** Docker Compose (PostgreSQL + Next.js)

## Roles

Admin > Supervisor > Zone Captain (own zone only) > Phone Operator (all zones, edit all) > Viewer (read-only)

## Development Process

This project follows [FutureFlow](https://github.com/1-Future/AI-Engineer-Toolbox/blob/master/FutureFlow.md) — an AI-native development process. Key points:

- **GitHub Issues are the source of truth** for task tracking. Each phase is an issue with a checklist.
- **Three approval gates:** After Phase 1 (foundation works), Phase 3 (core dashboard works), Phase 6 (full lifecycle works).
- **Reference folder** (`reference/`) contains all planning docs, legacy analysis, and coordinator questions.
- **Session notes** (`reference/session-notes.md`) — read this first when resuming work.

## Phase Order

1. Phase 1: Project Setup & Database (Issue #6)
2. Phase 2: PIN-Based Auth & RBAC (Issue #7)
3. Phase 3: Dashboard — The Green Bubble Board (Issue #8)
4. Phase 4: Real-Time Updates & Conflict Detection (Issue #1)
5. Phase 5: CSV Import Pipeline (Issue #2)
6. Phase 6: Audit Trail & CSV Export (Issue #3)
7. Phase 7: Admin Center & Board Reset (Issue #4)
8. Phase 8: Map View, Analytics & Polish (Issue #5)

## Conventions

- All secrets via environment variables, never hardcoded
- `.env.example` documents all required env vars
- Prisma for all database access — no raw SQL unless necessary
- API routes in `app/api/` using Next.js Route Handlers
- Components in `components/` with shadcn/ui patterns
- Server actions preferred over client-side API calls where appropriate

## Legacy Reference

The old app's source is at `C:\greenbubble\LocationTracking-RelasedVersion-2.1.0\` and `C:\greenbubble\LocationTracking-master\`. Real election CSV data is at `C:\greenbubble\novgb\`. Use these for understanding business logic and data shapes — never modify them.

## Key Files

- `reference/system-analysis.md` — complete legacy app technical analysis
- `reference/coordinator-questions.md` — questions for the poll worker coordinator (bring to meeting)
- `reference/security-concerns.md` — 12 security findings from legacy app
- `reference/new-features.md` — 16 planned features across 3 priority tiers
- `reference/session-notes.md` — running notes between work sessions
