# New Features: GreenBubble V2

> **Purpose:** Documents all planned new features and improvements for the rebuilt application, based on requirements gathered from stakeholder discussions and legacy system analysis.

---

## Priority 1: Must-Have for Launch

### 1. Real-time Status Updates with Conflict Detection
- **Problem:** Two users can silently overwrite each other's status changes.
- **Solution:**
  - Optimistic locking (version tracking per location)
  - Live UI updates via WebSockets when anyone makes a change
  - Conflict warning: "This location was updated by [user] 2 minutes ago. Overwrite?"
  - Status change logged with user, timestamp, old value, new value

### 2. Status Change Guardrails
- **Problem:** No warnings when reverting status (e.g., Ready to Unready). No validation.
- **Solution:**
  - Confirmation dialog on status reversals
  - Optional reason field for audit trail
  - Visual indicator showing who last changed the status and when

### 3. Admin Center / Bulk Operations
- **Problem:** No way to reset the board, revert changes, or perform bulk operations.
- **Solution:**
  - "Reset All to Unready" button (with confirmation)
  - Reset by zone
  - Snapshot/restore: save board state at a point in time
  - Restricted to Admin role only

### 4. Test Mode
- **Problem:** Testing uses production data. Coordinator cannot practice without risk.
- **Solution:**
  - Toggle between Test and Production modes
  - Test mode uses a copy of production data
  - Visual banner so no one is confused
  - Test changes never affect production

### 5. User Management UI (RBAC)
- **Problem:** You are the bottleneck for creating/editing user accounts.
- **Solution:**
  - Self-service user management panel
  - Supervisors can create, edit, deactivate accounts
  - Bulk user creation (import 50 temps at once)
  - Account deactivation (not deletion, for audit purposes)

### 6. PIN-based Temp Access
- **Problem:** 50 temps need accounts fast, no emails, username=password is insecure.
- **Solution:**
  - Admin/Supervisor generates batch of PINs (4-6 digit)
  - Each PIN tied to a name and zone assignment
  - PINs auto-expire after election day
  - Printable PIN sheet for distribution

### 7. Viewer Role
- **Problem:** Full-time staff have edit permissions when they only need to watch.
- **Solution:**
  - New Viewer role: read-only access to dashboard, map, and audit logs
  - Cannot change any status or data
  - Can view all zones

### 8. Secure Authentication and Authorization
- **Problem:** Hardcoded credentials, open endpoints, no HTTPS. App accessed over untrusted networks (MiFi, location WiFi).
- **Solution:**
  - Environment-based secrets management
  - RBAC enforced on ALL API endpoints
  - HTTPS enforced everywhere (critical since traffic traverses MiFi/public WiFi)
  - Rate limiting on login endpoints
  - Account lockout after failed attempts
  - CSRF/XSS protections

---

## Priority 2: High Value

### 9. Automated Data Pipeline
- **Problem:** Manual transformation of 7+ Excel/CSV files before each election.
- **Solution:**
  - Smart CSV importer that auto-detects format
  - Validation with preview before import
  - Atomic imports: all-or-nothing (rollback on failure)
  - Import history logging
  - Template downloads for GIS team and pollworker team

### 10. Integrated Audit Trail
- **Problem:** Audit table exists but is disconnected from the app.
- **Solution:**
  - Every status change logged: who, what, when, old value, new value, reason
  - Audit log viewable in the app UI
  - Filterable by location, user, date range, zone
  - Exportable to CSV/Excel for compliance reporting

### 11. Contact Information Integration
- **Problem:** Contact data comes from separate pollworker team spreadsheets, merged manually.
- **Solution:**
  - Contact info displayed alongside location in dashboard
  - Click a location to see all contacts, phone numbers, roles
  - Import contacts via same smart CSV pipeline

### 12. Zone-scoped Views for Operators
- **Problem:** All users see all data regardless of their zone assignment.
- **Solution:**
  - Operators/Zone Captains see only their assigned zone(s)
  - Supervisors and above see all zones
  - Zone assignment managed in user profile

---

## Priority 3: Nice-to-Have

### 13. Interactive Map View
- **Solution:**
  - Map view with color-coded status pins
  - Click pin to see status, contacts, precincts
  - Filter by zone, status, municipal
  - Uses lat/long from poll_Location_All data

### 14. Dashboard Analytics
- **Solution:**
  - Summary cards with progress bars
  - Zone breakdown percentages
  - Exportable summary report

### 15. Notification System
- **Solution:**
  - Scoped notifications by zone
  - Alert when location status reverts
  - Optional email/SMS for supervisors on critical events

### 16. Mobile-Responsive Design
- **Solution:**
  - Dashboard works on tablets and phones
  - Simplified mobile view focused on status updates

---

## Proposed Role Structure

| Role | View Dashboard | Edit Status | Upload Data | Manage Users | Admin Ops | Test Mode |
|------|---------------|-------------|-------------|-------------|-----------|-----------|
| Admin | All zones | All | Yes | Yes | Yes | Yes |
| Supervisor | All zones | All | Yes | Create temps | No | Yes |
| Coordinator | All zones | All | No | No | No | Reset test |
| Operator (temp) | Own zone | Own zone | No | No | No | No |
| Viewer | All zones | No | No | No | No | No |

---

## Proposed Tech Stack

| Component | Legacy | Proposed | Reason |
|-----------|--------|----------|--------|
| Backend | ASP.NET Web API 4.6.1 | TBD (ASP.NET Core or Node.js) | Modern, cross-platform, better security |
| Frontend | Unknown SPA | React | Modern, component-based, large ecosystem |
| Database | SQL Server (remote) | PostgreSQL or SQL Server | Cost, features, or existing infrastructure |
| Real-time | SignalR (basic) | SignalR Core or Socket.io | Scoped updates, conflict detection |
| Auth | ASP.NET Identity + OAuth | JWT + RBAC + PIN system | Flexible, supports temp/permanent users |
| ORM | Entity Framework 6 (DB First) | EF Core or Prisma | Code First, migrations, modern tooling |
| Hosting | IIS Express (local dev) | TBD (Azure, AWS, on-prem) | Based on county IT requirements |

---

## Open Questions

1. Hosting: Azure/AWS cloud or on-premises county infrastructure?
2. Database: Keep SQL Server or migrate to PostgreSQL?
3. Backend: Stay .NET (ASP.NET Core) or switch to Node.js?
4. SSO: Should full-time staff use Active Directory / SSO?
5. Compliance: Any specific public-sector compliance requirements?
6. Data retention: How long must audit logs and election data be retained?
7. Offline support: Do field staff need offline capability?
8. Can you upload the SPA folder (frontend code) from the legacy app?

---

*Document prepared as part of the GreenBubbleV2 rebuild reference materials.*