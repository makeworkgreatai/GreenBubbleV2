# Security Concerns: Legacy Location Tracking Application

> **Purpose:** This document outlines security vulnerabilities and risks identified in the existing Location Tracking (GreenBubble) application. It serves as supporting documentation for the proposal to rebuild the application with modern security standards appropriate for a public-sector deployment.

---

## 🔴 CRITICAL

### 1. Hardcoded Database Credentials in Source Code
- **Finding:** The `Web.config` file contains plaintext database credentials (username, password, and IP address of the SQL Server).
- **Risk:** If the source code is leaked, shared, or stored in a public repository, an attacker gains **full read/write access** to the production database containing voter precinct data, poll worker contact information, and location data.
- **Impact:** Complete data breach, data manipulation, data destruction.
- **Remediation:** Store credentials in environment variables or a secrets vault (e.g., Azure Key Vault, AWS Secrets Manager). Never commit credentials to source code.

### 2. Unauthenticated API Endpoints
- **Finding:** Several API endpoints have **no authorization requirements**:
  - `api/poll_Location_All` — Master location list with GPS coordinates
  - `api/election_Precinct` — Precinct data with full CRUD
  - `api/poll_ContactDetails` — Poll worker personal contact info (names, phone numbers)
  - `api/zones` — Zone configuration
- **Risk:** Anyone with the URL can **read, create, modify, or delete** sensitive election and contact data without logging in.
- **Impact:** Unauthorized data access, data tampering, deletion of critical election data.
- **Remediation:** Enforce authentication and role-based authorization (RBAC) on ALL API endpoints. No exceptions.

### 3. Weak/Non-existent Authentication for Temporary Users
- **Finding:** Temporary poll worker accounts use **username = password** (identical values). Approximately 50 temp accounts are created in a rush before each election.
- **Risk:** Any person who knows a temp's username automatically knows their password. Credentials are trivially guessable.
- **Impact:** Unauthorized access to the tracking system, false status updates, disruption of election day operations.
- **Remediation:** Implement time-limited PIN-based access, QR code login, or randomized credentials with bulk generation tools. Enforce minimum password complexity for all permanent accounts.

---

## 🟠 HIGH

### 4. No Transport Layer Encryption (HTTP Only)
- **Finding:** The application is configured to run on HTTP (port 60855). There is no evidence of HTTPS/TLS enforcement.
- **Risk:** All data transmitted between users and the server — including login credentials, poll worker phone numbers, and status updates — can be **intercepted in plaintext** by anyone on the network.
- **Impact:** Credential theft, data interception, man-in-the-middle attacks.
- **Remediation:** Enforce HTTPS/TLS on all connections. Redirect HTTP to HTTPS. Use valid SSL certificates.

### 5. No Concurrency Control on Status Updates
- **Finding:** The `poll_LocationController` saves status changes with no optimistic concurrency checks. When two users update the same location simultaneously, the **last write silently wins** with no warning.
- **Risk:** Critical status information (e.g., "Building Open", "Polls Ready") can be **silently overwritten**, leading to incorrect election day operations.
- **Impact:** Incorrect poll status data, confusion among field staff, potential election day disruptions.
- **Remediation:** Implement optimistic concurrency (version/timestamp checks). Warn users when a conflict is detected. Log all conflicts.

### 6. No Rate Limiting or Brute Force Protection
- **Finding:** The login endpoint does not implement rate limiting. While `LockoutEnabled` exists in the user model, it is unclear if account lockout is properly configured.
- **Risk:** Automated brute force attacks can try unlimited password combinations against any account.
- **Impact:** Account compromise, unauthorized access.
- **Remediation:** Enforce account lockout after N failed attempts. Implement rate limiting on authentication endpoints. Consider CAPTCHA after repeated failures.

### 7. No Role Separation for View-Only Access
- **Finding:** The existing role structure (Admin, Election Support, Manager, Phone Operator, Supervisor, Zone Captains) does **not include a Viewer/read-only role**. Full-time staff who only need to monitor the dashboard are given roles with edit permissions.
- **Risk:** Accidental or unauthorized data modifications by staff who should only have read access.
- **Impact:** Data integrity issues, accidental status changes during live operations.
- **Remediation:** Add a dedicated Viewer role with read-only permissions. Implement least-privilege access model.

---

## 🟡 MEDIUM

### 8. Unsafe CSV File Upload Processing
- **Finding:** The `FileUploaderController` parses CSV data using `int.Parse()` and `double.Parse()` directly with **no input validation, no try/catch around parsing, and no file size limits**.
- **Risk:** A malformed CSV file could crash the application, inject unexpected data, or cause partial data corruption (some records saved before failure, no rollback).
- **Impact:** Application crashes, data corruption, partial data loads requiring manual cleanup.
- **Remediation:** Validate all input fields before processing. Implement file size limits. Wrap imports in database transactions for atomic rollback. Return detailed error reports.

### 9. Overly Broad Real-Time Notifications
- **Finding:** The SignalR hub broadcasts a generic `hello()` message to **ALL connected clients** whenever any status changes. There is no scoping by user role or zone.
- **Risk:** Users can observe all system activity regardless of their assigned zone or role. A malicious client could monitor all election day operations.
- **Impact:** Information disclosure across role/zone boundaries.
- **Remediation:** Scope real-time notifications by zone and role. Only push relevant updates to authorized users.

### 10. Disconnected Audit Trail
- **Finding:** An `audit_Table` exists in the database but is **NOT integrated into the application's Entity Framework model or controllers**. Audit logging appears to rely on a separate mechanism (likely a database trigger) that is not visible to or managed by the application.
- **Risk:** Audit records may be incomplete, inconsistent, or bypassable. Direct database modifications bypass the audit trail entirely.
- **Impact:** Inability to accurately determine who changed what and when. Compliance risk for public-sector accountability requirements.
- **Remediation:** Implement application-level audit logging for all data changes. Record user, timestamp, old value, new value, and reason for every status change.

### 11. No CSRF or XSS Protection
- **Finding:** API endpoints do not implement anti-forgery tokens. CORS policy is not explicitly configured. Input sanitization practices are not evident.
- **Risk:** Cross-Site Request Forgery (CSRF) attacks could trick authenticated users into making unintended changes. Cross-Site Scripting (XSS) could inject malicious code if user input is reflected without escaping.
- **Impact:** Unauthorized actions performed on behalf of authenticated users, session hijacking.
- **Remediation:** Implement CSRF tokens on all state-changing requests. Configure strict CORS policies. Sanitize and escape all user input on both server and client side.

### 12. No Account Expiration for Temporary Users
- **Finding:** Temporary poll worker accounts are created before each election but there is **no mechanism to automatically deactivate or expire them** afterward.
- **Risk:** Stale temp accounts remain active indefinitely, creating an ever-growing attack surface. Former temps retain access to the system.
- **Impact:** Unauthorized access by former temporary staff.
- **Remediation:** Implement automatic account expiration for temp accounts (configurable per election cycle). Provide admin tools for bulk deactivation.

---

## Summary Table

| # | Severity | Vulnerability | Current State | Proposed Fix |
|---|----------|--------------|---------------|-------------|
| 1 | 🔴 Critical | Hardcoded DB credentials | Plaintext in source code | Secrets vault / env vars |
| 2 | 🔴 Critical | Unauthenticated APIs | 4+ endpoints wide open | RBAC on all endpoints |
| 3 | 🔴 Critical | Weak temp authentication | Username = password | PIN-based / expiring codes |
| 4 | 🟠 High | No HTTPS | HTTP only | Enforce TLS everywhere |
| 5 | 🟠 High | No concurrency control | Last write wins silently | Optimistic locking + warnings |
| 6 | 🟠 High | No brute force protection | Unlimited login attempts | Lockout + rate limiting |
| 7 | 🟠 High | No view-only role | Staff have edit access | Add Viewer role |
| 8 | 🟡 Medium | Unsafe CSV uploads | No validation/rollback | Input validation + transactions |
| 9 | 🟡 Medium | Broad SignalR broadcasts | All users see all updates | Scope by zone/role |
| 10 | 🟡 Medium | Disconnected audit trail | DB trigger only | App-level audit logging |
| 11 | 🟡 Medium | No CSRF/XSS protection | None implemented | CSRF tokens + input sanitization |
| 12 | 🟡 Medium | No temp account expiration | Accounts persist forever | Auto-expiration per election |

---

## Recommendation

The cumulative security risk of the existing application is **significant**, particularly given its use in **public-sector election operations**. The combination of hardcoded credentials, unauthenticated endpoints, and weak temporary user authentication creates multiple vectors for data breach, tampering, or disruption.

**A ground-up rebuild with modern security practices is strongly recommended** to:
1. Protect sensitive election and personal contact data
2. Ensure accountability through proper audit trails
3. Meet public-sector security compliance expectations
4. Provide a stable, maintainable platform for current and future election cycles

---

*Document prepared as part of the GreenBubbleV2 rebuild reference materials.*