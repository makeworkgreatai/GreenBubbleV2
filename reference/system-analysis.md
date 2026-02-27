# System Analysis: Legacy LocationTracking Application

> **Purpose:** Complete technical analysis of the existing GreenBubble application based on source code review. This is the master reference document for the rebuild.

---

## Architecture Overview

```
[Browser SPA] → [ASP.NET Web API] → [Entity Framework 6] → [SQL Server]
                       ↕
                  [SignalR Hub]
```

- **Pattern:** Single Page Application calling REST API
- **Framework:** ASP.NET Web API on .NET Framework 4.6.1
- **Database:** SQL Server at 184.168.194.53 (database: ph13696936071_ElectionReporting)
- **ORM:** Entity Framework 6 Database-First with EDMX model
- **Real-time:** SignalR broadcasting to all connected clients
- **Auth:** ASP.NET Identity with OAuth bearer tokens
- **Hosting:** IIS Express for dev (localhost:60855), production hosting unknown

---

## Database Schema

### Core Tables

**poll_Location** (Primary operational table)
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| poll_Id | int | NO (PK) | Unique location identifier |
| poll_Name | nvarchar(50) | NO | Location name |
| poll_Address | nvarchar(50) | NO | Street address |
| Zone | int | YES | Zone number (1-6) |
| Monday_Delivery | int | YES | Status: 0=not done, 1=done |
| Monday_Arrival | int | YES | Status: 0=not done, 1=done |
| Monday_Close | int | YES | Status: 0=not done, 1=done |
| Building_Open | int | YES | Status: 0=not done, 1=done |
| Tuesday_Arrival | int | YES | Status: 0=not done, 1=done |
| OpenReady | int | YES | Status: 0=not done, 1=done |
| ClosePollReady | int | YES | Status: 0=not done, 1=done |

**poll_Location_All** (Master reference)
| Column | Type | Description |
|--------|------|-------------|
| poll_id | int (PK) | Location identifier |
| status | nvarchar(255) | Active/Inactive |
| latitude | float | GPS latitude |
| longitude | float | GPS longitude |
| location_Name | nvarchar(255) | Full location name |
| location_Address | nvarchar(255) | Full address |
| city | nvarchar(255) | City name |
| state | nvarchar(255) | State |

**election_Precinct** (Precinct mapping)
| Column | Type | Description |
|--------|------|-------------|
| poll_Id | int | FK to poll_Location |
| precinct_Id | int (PK) | Unique precinct ID |
| ward_Name | nvarchar(50) | Municipal/Ward name |
| precinct | nvarchar(50) | Precinct label (e.g., "1A", "2B.01") |

**dbo_poll_ContactDetails** (Contact info)
| Column | Type | Description |
|--------|------|-------------|
| r_Id | int (PK, auto) | Row ID |
| poll_Id | int | FK to poll_Location |
| contact_FirstName | nvarchar(50) | First name |
| contact_LastName | nvarchar(50) | Last name |
| contact_Type | nvarchar(50) | Contact type/role |
| contact_Info | nvarchar(50) | Phone number |

**dbo_zones** (Zone configuration)
| Column | Type | Description |
|--------|------|-------------|
| id_zone | int (PK, auto) | Zone row ID |
| zone | int | Zone number |
| zone_Name | nvarchar(50) | Zone name |
| zone_Kml | nvarchar(50) | KML file path |
| zone_Active | int | Active flag |

### Views

**LocTrackMain** (SQL VIEW - Dashboard data)
- Joins poll_Location with election_Precinct
- Concatenates precinct labels per location
- Used by main dashboard endpoint
- Read-only (no primary key defined, EF treats as read-only)

### Database Schemas
- **dbo** — main application tables
- **tadmin** — contact details, zones, audit table

---

## Controllers (API Endpoints)

### FileUploaderController (The Critical One)
- **Route:** api/FileUploader
- **Auth:** Admin, Manager, Supervisor
- **Purpose:** Bulk CSV import for election data
- **Process:**
  1. Receives multipart file upload
  2. Saves to /locker/ folder
  3. Reads CSV using custom ExcelObject parser
  4. Determines type by file key name ("Location List", "Precinct List", etc.)
  5. Parses row by row, counting columns manually
  6. Inserts to database one record at a time
  7. Deletes uploaded files when done
- **Issues:**
  - No input validation
  - No transaction rollback on partial failure
  - One-at-a-time DB saves (slow)
  - Commented-out duplicate check for contacts

### poll_LocationController (Status Updates)
- **Route:** api/poll_Location
- **Auth:** Authorized (any logged-in user)
- **Key behavior:** POST handles both create and update (checks if poll_Id != 0)
- **SignalR:** Calls locationUpdatesHub.SayHello() after successful save
- **Issues:**
  - No concurrency control
  - Commented-out PUT method (all updates via POST)

### LocTrackMainsController (Dashboard)
- **Route:** api/LocTrackMains
- **Auth:** Admin, Manager, Supervisor, User
- **Purpose:** Main dashboard data with LINQ join
- **Maps status ints to CSS classes:** 1 → "success" (green), 0 → "warning" (yellow)

### poll_ContactDetailsController
- **Route:** api/poll_ContactDetails
- **Auth:** NONE (security gap)
- **GET by ID:** Returns all contacts for a given poll_Id

### AccountController
- **Route:** api/Account
- **Register:** Creates user and assigns role via model.Name field
- **Roles assigned during registration**

---

## SignalR Hub

**locationUpdatesHub**
- Broadcasts hello() to ALL connected clients on any status change
- Tracks connected user IDs in static HashSet
- Groups users by Identity username
- No zone/role scoping
- No payload in broadcast (client must re-fetch all data)

---

## Data Files (Election 264 Reference)

### Precincts_List_264.csv
- 804 rows of precinct-to-poll mappings
- Fields: Poll_id, precinct_id, Municipal, Label
- 55 municipalities across Cuyahoga County

### Poll_Locations_264.csv
- 271 unique polling locations
- Fields: poll_id, location_line_1, location_line_2, Zone
- Zones 1-6

### Polls_Elec_264.csv
- 271 locations with GPS coordinates
- Fields: poll_id, status, Latitude, Longitude, location_line_1, location_line_2, city, Precincts
- Precincts field is human-readable text (not normalized)

### Upload Templates (from README.txt)
1. Polling Location List: Poll_Id, Poll_Name, Poll_Zone
2. Location Details: Poll_Id, Contact_FirstName, Contact_LastName, Contact_Type, Ph_Number
3. Precinct List: Poll_Id, Precinct_Id, Ward_Name, Precinct
4. Users List: Username, Password, Role
5. Polling Location ALL: Poll_Id, Status, Latitude, Longitude, Location_Name, Location_Address, City, State

---

## Key Observations

1. **The app was built by a developer named Reuben** (visible in file paths and project structure)
2. **Database is hosted externally** at GoDaddy (184.168.194.53 with ph13696936071 prefix)
3. **The app was left partially complete** — commented-out code, placeholder endpoints, unfinished KML support
4. **The LocTrackMain VIEW is the clever part** — it pre-joins data so the dashboard query is simple
5. **Status columns use 0/1 integers** mapped to CSS classes in the controller, not in the database
6. **The real pain point is the data pipeline** — 7+ Excel sheets manually merged before each election

---

*Document prepared as part of the GreenBubbleV2 rebuild reference materials.*