# Phase 2: PIN-Based Authentication & RBAC

> **Everyone logs in with Name + PIN. The PIN determines your role.**

No emails. No passwords. No account creation flow. Admin generates PINs, each tied to a role (and zone for Zone Captains). Hand out a printed sheet. Done.

**Roles:** Admin · Supervisor · Zone Captain · Phone Operator · Viewer

---

## Tasks

- [ ] Create login page UI: Name input + PIN input + Enter button — no email, no password, no forgot-password flow
- [ ] Implement PIN hashing — PINs stored as bcrypt hashes, never plaintext
- [ ] Create API route `POST /api/auth/login` — validate name + PIN hash, return JWT session containing user id, role, and zone
- [ ] Implement session management: JWT stored in httpOnly secure cookie, auto-refresh
- [ ] Create RBAC middleware that reads JWT and enforces role permissions on all API routes
- [ ] Define role permission map:
  - Admin: all access, all zones, generate PINs, reset board, import data
  - Supervisor: all zones, edit all, generate PINs for lower roles, import data
  - Zone Captain: view and edit own zone only
  - Phone Operator: view all zones, edit all, see contact details
  - Viewer: read-only, all zones, no edits
- [ ] Protect ALL API routes — zero unauthenticated endpoints (fix the #1 security gap from legacy app)
- [ ] Create admin-only API route `POST /api/admin/pins/generate` — input: role, count, zone (if Zone Captain), expiry date. Output: array of generated PINs
- [ ] Create admin PIN management page: select role, select zone (if applicable), set count, set expiry, generate button
- [ ] Create printable PIN sheet view: table of Name (blank for user to fill)/PIN/Role/Zone with print-friendly CSS
- [ ] Add PIN expiration: expired PINs rejected at login, admin can set expiry per batch
- [ ] Create `POST /api/admin/pins/expire-all` — bulk expire all PINs (post-election cleanup)
- [ ] Log all login attempts to AuditLog: user, timestamp, role, success or failure, IP address

---

**Depends on:** Phase 1 (database + project setup)  
**Blocks:** Phase 3 (dashboard needs auth), Phase 7 (admin center)  
**Reference docs:** `reference/security-concerns.md`, `reference/coordinator-questions.md` (Section 2: Roles)