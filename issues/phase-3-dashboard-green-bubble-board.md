# Phase 3: Dashboard — The Green Bubble Board

> **The main screen. This is what tips the scale.**

The board shows every polling location as a row. Left side = info columns (locked in). Right side = status bubble columns (configurable milestones — finalize with coordinator using `reference/coordinator-questions.md`).

**Info columns:** Poll ID · Poll Name · Poll Address · Zone · City · Precinct

**Status columns:** Configurable milestones from StatusMilestone table (default: Monday Delivery → Close Poll Ready)

---

## Tasks

- [ ] Create dashboard page layout: header with app name, logged-in user name, role badge, zone indicator
- [ ] Build location table component: each row = one polling location
- [ ] Render info columns (left side): Poll ID, Poll Name, Poll Address, Zone, City, Precinct labels
- [ ] Render status bubble columns (right side): one column per StatusMilestone, ordered by display_order
- [ ] Style status cells as colored circle indicators: green filled = done, yellow/empty = pending — the "green bubbles"
- [ ] Implement click-to-toggle on status bubbles for roles with edit permission (Admin, Supervisor, Zone Captain own zone, Phone Operator)
- [ ] Show tooltip on hover/click of each status bubble: "Updated by [name] at [time]" or "Not yet updated"
- [ ] Implement zone scoping: Zone Captains see only their assigned zone's locations, all other roles see everything
- [ ] Add zone filter dropdown for roles that see all zones (Supervisor, Admin, Viewer, Phone Operator)
- [ ] Add search bar: filter locations by name, address, or precinct in real time
- [ ] Add column header sorting: click to sort by any column
- [ ] Add summary row at top of each status column: "X of Y done" with progress percentage
- [ ] Enforce Viewer role: status bubbles are display-only, no click-to-toggle, no edit UI
- [ ] Style with Tailwind + shadcn/ui: clean, modern, professional — make the legacy app look dated by comparison

---

**Depends on:** Phase 1 (schema + seed data), Phase 2 (auth — must know who is logged in and their role)  
**Blocks:** Phase 4 (real-time updates target the dashboard)  
**Reference docs:** `reference/current-features.md`, `reference/coordinator-questions.md` (Section 1: Status Milestones)  
**Coordinator dependency:** Status milestone names and order must be confirmed before finalizing the bubble columns. Use defaults (legacy 7) until then.