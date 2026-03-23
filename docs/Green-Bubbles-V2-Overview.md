# Green Bubbles V2

**Cuyahoga County Board of Elections**

---

## V1 vs V2

| | V1 (Legacy) | V2 (New) |
|---|---|---|
| **Real-time** | SignalR — broadcasts everything to everyone, no granularity | Server-Sent Events — granular per-bubble updates, connection indicator, auto-reconnect |
| **Status updates** | Web only — someone has to be at a computer | Web + SMS — field workers text from basic cell phones |
| **Editing** | No inline editing | Edit anything on the board — locations, contacts, phones, precincts. Buffered with undo |
| **Data import** | 5 separate CSV uploads, manual formatting, no error handling | Drop all files at once — auto-detects type, processes in order, supports XLSX |
| **Audit** | Database table not connected to the app, had to pull manually | Full audit viewer, CSV export in coordinator format, reason required for unmarking |
| **User management** | ASP.NET Identity with passwords, CSV upload only | PIN-based auth with 3 modes, full account management page, inline editing |
| **Security** | Several API endpoints had no auth at all | Every endpoint authenticated, role-based access, zone restrictions, SMS phone locking |
| **Backup/restore** | Nothing | CSV backup and restore of the entire board |
| **Night mode** | No | Yes |
| **Board reset** | No admin tools | Clear Election (forces audit download), Delete Locations (forces CSV backup) |
| **Tech** | ASP.NET 4.6.1, SQL Server, Visual Studio 2017 | Next.js 15, TypeScript, PostgreSQL, Tailwind CSS, Twilio |
| **Hosting** | External SQL Server at a static IP | Self-contained, runs anywhere |

---

## SMS Status Updates

Two options for how texting can work. Both use the same Twilio number and cell phone assignments.

### Option A: Field Workers Text In (Current)

The location's assigned cell phone texts our Twilio number to report status. The worker initiates.

**How it works:**
1. Worker at the location texts milestone numbers to the Green Bubbles number
2. System identifies the location by the phone number
3. Dashboard updates in real-time

**Text commands:**
| Text | Action |
|------|--------|
| `1 2 3` | Mark milestones 1, 2, 3 GREEN |
| `U1 U2` | Undo milestones 1, 2 back to RED |
| `S` | Get current status |
| `HELP` | List commands |

**Pros:**
- Simple — workers text when they're ready
- No outbound messaging costs
- No 10DLC registration needed
- Workers control the pace

**Cons:**
- Workers have to remember to text
- No way to prompt them if they forget
- Relies on workers knowing the commands

---

### Option B: We Text Them, They Reply (Future)

The system sends a prompt to all location phones at key times. Workers just reply to confirm.

**How it would work:**
1. Admin triggers a broadcast: "Has Monday Delivery arrived? Reply YES or NO"
2. System texts all location phones
3. Workers reply YES or NO
4. Dashboard updates automatically based on replies

**Example flow:**
- 6:00 AM — System texts: "Monday Delivery — Has equipment been delivered? Reply 1 for YES"
- Worker replies: `1`
- Dashboard marks Monday Delivery GREEN for that location

**Pros:**
- Workers don't need to know commands — just reply
- System controls timing — can prompt at each milestone
- Harder to forget — the text is sitting on their phone
- Can schedule automatic broadcasts

**Cons:**
- Requires A2P 10DLC registration with Twilio ($15 + carrier fees)
- Outbound SMS costs (~$0.0079/text per location per milestone)
- More complex — need broadcast scheduling, reply parsing
- Risk of workers replying to the wrong prompt

---

### Recommendation

**Start with Option A** — it's working now, no extra cost or registration.

**Add Option B later** if the coordinator wants prompted check-ins. The infrastructure is already in place — just needs 10DLC registration and a broadcast feature.

Both options can coexist — Option B sends the prompts, but workers can still use Option A commands anytime.

---

## New Features

### Real-Time Updates
The board updates live across all screens. When someone changes a status — from the web or via text — every connected user sees it instantly. No more refreshing.

### Admin Toolbar
Dark bar at the top (admin only) with quick access to everything:

**Edit Dashboard** · **Account Management** · **Cell Management** · **Import Data** · **Save Audit** · **Save/Restore CSV** · **Clear Election** · **Delete Locations**

### Edit Dashboard
Edit anything directly on the board — locations, contacts, phones, precincts. Add or delete rows. All changes are buffered locally with undo. Nothing saves until you hit Apply.

### Account Management
Full user management — see all accounts in a table, click to edit names/roles, generate PINs in bulk, import legacy logins from spreadsheet, deactivate or delete accounts.

### Cell Management
Assign cell phones to locations for SMS. Sortable table, inline editing, CSV import/export. Same number can't be on two locations.

### Data Import
Drop all your files at once. System auto-detects each file by its column headers and processes in the right order. Supports CSV and XLSX.

### Audit System
Every change is logged — who, when, what, and why. Reason required when unmarking a milestone. SMS updates logged with sender phone. Searchable viewer with CSV export matching the coordinator's existing format. Clear Election forces an audit download first.

### Night Mode
Moon icon in the header. Darkens the board for low-light environments.

### Backup & Restore
Save the entire board as a CSV. Restore from a previous backup. Delete Locations forces a CSV backup before wiping.

---

*Green Bubbles V2 — March 2026*
