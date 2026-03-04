# Phase 1: Project Setup & Database

> **The foundation — nothing runs without this.**

This phase scaffolds the Next.js project, connects PostgreSQL via Prisma, and defines the complete database schema. No features, no UI — just a solid foundation that everything else builds on.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Prisma · PostgreSQL · Docker

---

## Tasks

- [ ] Initialize Next.js 15 project with TypeScript and App Router in the repo root
- [ ] Install and configure Tailwind CSS and shadcn/ui component library
- [ ] Install Prisma ORM and configure PostgreSQL connection via environment variables (never hardcoded)
- [ ] Create Prisma schema: `Zone` model — id, number, name, active
- [ ] Create Prisma schema: `Location` model — id, name, address, zone relation, lat, lng, version (for optimistic locking)
- [ ] Create Prisma schema: `StatusMilestone` model — id, key, label, display_order (configurable per coordinator — see `reference/coordinator-questions.md`)
- [ ] Create Prisma schema: `LocationStatus` model — id, location relation, milestone relation, value (boolean), updated_by, updated_at
- [ ] Create Prisma schema: `Contact` model — id, location relation, first_name, last_name, type, phone
- [ ] Create Prisma schema: `Precinct` model — id, location relation, ward_name, label
- [ ] Create Prisma schema: `User` model — id, display_name, pin_hash, role (enum: ADMIN/SUPERVISOR/ZONE_CAPTAIN/PHONE_OPERATOR/VIEWER), zone relation (nullable), active, expires_at
- [ ] Create Prisma schema: `AuditLog` model — id, location_id (nullable), field, old_value, new_value, user_id, reason, created_at
- [ ] Create Prisma schema: `ImportLog` model — id, file_type, file_name, row_count, status, errors (JSON), user_id, created_at
- [ ] Run initial Prisma migration and verify all tables exist in PostgreSQL
- [ ] Create seed script with sample data: 6 zones, 20 locations, 7 default milestones (Monday Delivery through Close Poll Ready), sample precincts and contacts
- [ ] Create Docker Compose file for local development (PostgreSQL container + Next.js dev server)
- [ ] Add `.env.example` with all required environment variables documented

---

**Depends on:** Nothing — this is the first phase
**Blocks:** All other phases
**Reference docs:** `reference/system-analysis.md`, `reference/new-features.md`