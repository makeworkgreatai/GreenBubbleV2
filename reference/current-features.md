# Current Features: Legacy GreenBubble Application

> **Purpose:** Documents all existing functionality in the legacy LocationTracking application, based on source code analysis of Models, Controllers, Views, Hubs, and Web.config.

---

## Tech Stack (Legacy)
- **Backend:** ASP.NET Web API (.NET Framework 4.6.1)
- **Frontend:** SPA (Single Page Application) — framework TBD (need SPA folder)
- **Database:** SQL Server (hosted at 184.168.194.53)
- **ORM:** Entity Framework 6 (Database First, EDMX model)
- **Real-time:** SignalR (basic broadcast)
- **Auth:** ASP.NET Identity with OAuth Bearer tokens
- **IDE:** Visual Studio 2017

---

## Core Features

### 1. Poll Location Status Tracking (Main Dashboard)
- Displays all poll locations in a table (the "Green Bubble" board)
- **7 status columns** (each is 0 or 1 in DB, displayed as green "success" or yellow "warning"):
  1. Monday Delivery
  2. Monday Arrival
  3. Monday Close
  4. Building Open
  5. Tuesday Arrival
  6. Open Ready
  7. Close Poll Ready
- Each row shows: Poll ID, Location Name, Address, Zone, Ward/Municipal, Precincts
- Status updates trigger SignalR broadcast to refresh all connected clients

### 2. Poll Location Master List
- Stores all possible poll locations with:
  - Poll ID, Status, Latitude, Longitude
  - Location Name, Address, City, State
- Used as reference data; imported via CSV each election

### 3. Precinct Mapping
- Maps precincts to poll locations (many precincts per location)
- Fields: Poll ID, Precinct ID, Ward Name, Precinct Label
- `LocTrackMain` SQL VIEW joins poll_Location + election_Precinct and concatenates precinct labels per location

### 4. Contact Information
- Stores contact details per poll location:
  - First Name, Last Name, Contact Type, Contact Info (phone)
- Multiple contacts per location supported
- Used by phone operators to call locations

### 5. Zone Management
- Zones divide the county into geographic regions
- Fields: Zone ID, Zone Number, Zone Name, Zone KML path, Active flag
- KML support suggests map overlay capability (may be unfinished)

### 6. CSV Data Import
- File upload endpoint (`api/FileUploader`)
- Handles 5 types of CSV uploads:
  1. **Location List** — Poll ID, Name, Address, Zone
  2. **Location Details** — Poll ID, Contact First/Last Name, Type, Phone
  3. **Precinct List** — Poll ID, Precinct ID, Ward Name, Precinct Label
  4. **Polling Location All** — Poll ID, Status, Lat, Long, Name, Address, City, State
  5. **KML File** — placeholder (not implemented)
- Files saved to `/locker/` folder, parsed, inserted to DB, then deleted
- Restricted to Admin, Manager, Supervisor roles

### 7. User Authentication & Roles
- ASP.NET Identity with bearer token auth
- Registration endpoint creates user and assigns role
- **6 Roles:**
  - Admin
  - Election Support
  - Manager
  - Phone Operator
  - Supervisor
  - Zone Captains
- No Viewer/read-only role exists
- Users uploaded via CSV: Username, Password, Role

### 8. Real-time Updates (SignalR)
- `locationUpdatesHub` broadcasts to ALL connected clients when any poll_Location is updated
- Tracks connected user IDs
- Groups users by username
- Client receives "hello" event and presumably refreshes data
- No granularity — all users get all updates regardless of zone/role

### 9. Audit Trail (Partial)
- `audit_Table` exists in database with fields:
  - r_Id, poll_Id, location_Name, mandatory_Calls
  - status_Old, status_New, user_Name, role, change_Date
- **NOT integrated into Entity Framework model or application code**
- Likely populated by SQL trigger or external process

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | api/LocTrackMains | Admin/Manager/Supervisor/User | Main dashboard data (joined view) |
| GET/POST | api/poll_Location | Authorized | Poll location CRUD + status updates |
| GET/PUT/POST/DELETE | api/poll_Location_All | **NONE** | Master location list |
| GET/PUT/POST/DELETE | api/election_Precinct | **NONE** | Precinct CRUD |
| GET/POST/DELETE | api/poll_ContactDetails | **NONE** | Contact info CRUD |
| GET/POST/DELETE | api/zones | **NONE** | Zone management |
| POST | api/FileUploader | Admin/Manager/Supervisor | CSV bulk upload |
| POST | api/Account/Register | AllowAnonymous | User registration |
| POST | api/Account/Logout | Authorized | Logout |
| GET | api/Role | Public | List roles |
| POST | api/Role/Create | Admin | Create role |

---

## Database Tables

| Table | Schema | Key | Description |
|-------|--------|-----|-------------|
| poll_Location | dbo | poll_Id | Active locations + 7 status columns |
| poll_Location_All | dbo | poll_id | Master list with lat/long |
| election_Precinct | dbo | precinct_Id | Precinct-to-poll mapping |
| LocTrackMain | dbo (VIEW) | composite | Joined view for dashboard |
| AspNetUsers | dbo | Id | User accounts |
| AspNetRoles | dbo | Id | Role definitions |
| AspNetUserRoles | dbo | UserId+RoleId | User-role mapping |
| AspNetUserClaims | dbo | Id | User claims |
| AspNetUserLogins | dbo | composite | External login providers |
| __MigrationHistory | dbo | composite | EF migrations |
| dbo.poll_ContactDetails | tadmin | r_Id (auto) | Contact info per location |
| dbo.zones | tadmin | id_zone (auto) | Zone definitions |
| audit_Table | tadmin | r_Id | Audit trail (not in app code) |
| mytable | tadmin | Poll_id+precinct_id | Precinct list (admin schema) |

---

## Data Flow (Election Cycle)

1. **GIS team** exports poll locations, precincts, coordinates from their system
2. **You** manually transform CSVs to match upload templates
3. **Pollworker team** provides contact data in separate Excel sheets
4. **You** merge 7+ Excel sheets manually
5. **You** upload CSVs through the app's file uploader
6. **Election day:** Operators update status columns in real-time
7. **After:** You manually extract audit data from the database

---

## Known Issues / Limitations

1. No conflict detection when two users update same location
2. No warning when reverting status (Ready → Unready)
3. No bulk reset / admin operations
4. No test mode (all changes hit production)
5. Audit trail not accessible through the app UI
6. CSV import has no validation or error recovery
7. Several API endpoints are unauthenticated
8. No view-only role for full-time staff
9. Manual data pipeline (7+ Excel sheets merged by hand)
10. App was left unfinished by original developer

---

*Document prepared as part of the GreenBubbleV2 rebuild reference materials.*