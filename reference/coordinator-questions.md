# Coordinator Collaboration: Questions for the Poll Worker Coordinator

> **Purpose:** Things to discuss with the poll worker coordinator before/during the GreenBubble V2 build. Bring this doc to your sit-down meeting. Check items off as decisions are made.

---

## 1. Status Milestones (The Bubble Columns)

The old app had 7 status columns. The new app lets you configure any number of milestones.

**Questions:**
- [ ] What are the current status milestones you want to track? (List them in order, left to right)
- [ ] Are these the same for every election type (primary, general, special)?
- [ ] Should any milestones be grouped? (e.g., "Monday" group, "Tuesday" group)
- [ ] Are there milestones that only certain roles should be able to update?
- [ ] Is there a natural sequence? (e.g., Monday Delivery must be done before Monday Arrival)

**Legacy milestones for reference:**
1. Monday Delivery
2. Monday Arrival
3. Monday Close
4. Building Open
5. Tuesday Arrival
6. Open Ready
7. Close Poll Ready

**Notes from meeting:**
> _(fill in during meeting)_

---

## 2. Roles & Permissions

The new app uses PIN-based login. Each PIN is assigned a role. No emails or passwords.

**Proposed roles:**

| Role | Can View | Can Edit Status | Can Import Data | Can Manage PINs | Can Reset Board |
|------|----------|----------------|-----------------|-----------------|-----------------|
| Admin | All zones | All | Yes | Yes | Yes |
| Supervisor | All zones | All | Yes | Generate lower-role PINs | No |
| Zone Captain | Own zone only | Own zone only | No | No | No |
| Phone Operator | All zones | All | No | No | No |
| Viewer | All zones | None (read-only) | No | No | No |

**Questions:**
- [ ] Are these 5 roles sufficient? Any missing?
- [ ] Should Phone Operators be able to edit statuses, or just view + see contact info?
- [ ] Should Zone Captains see other zones in read-only mode, or only their own zone?
- [ ] Should Supervisors be able to reset the board, or only Admins?
- [ ] Any role that needs to see contact details but NOT edit statuses?
- [ ] How many people per role (roughly)? Helps with PIN batch sizing.

**Notes from meeting:**
> _(fill in during meeting)_

---

## 3. Contact Information

The app can show contact details per polling location (names, phone numbers, roles).

**Questions:**
- [ ] What contact types exist? (e.g., Presiding Judge, Poll Worker, Building Contact)
- [ ] Which roles should see contact details? (currently: Phone Operator and above)
- [ ] How is contact data provided to you? (Excel sheet from pollworker team?)
- [ ] Does the format change between elections or is it consistent?
- [ ] How many contacts per location on average?

**Notes from meeting:**
> _(fill in during meeting)_

---

## 4. Data Pipeline

Before each election, CSV data needs to be imported into the app.

**Questions:**
- [ ] Who provides the location data? (GIS team?)
- [ ] Who provides the contact data? (Pollworker team?)
- [ ] Who provides the precinct mapping? (Same as locations?)
- [ ] How many separate files/sheets do you currently receive?
- [ ] Can we get the teams to provide data in a standard template? (App can generate downloadable templates)
- [ ] How far before election day does this data become available?
- [ ] Does data get updated/corrected after initial import? (last-minute location changes?)

**Notes from meeting:**
> _(fill in during meeting)_

---

## 5. Election Day Workflow

Understanding how the app is actually used during the day.

**Questions:**
- [ ] Walk me through a typical election morning — what happens first?
- [ ] Who updates statuses? (Zone Captains calling in? Phone Operators receiving calls?)
- [ ] Is there a command center where supervisors watch the board?
- [ ] What happens when a status needs to be reverted? (e.g., marked "Building Open" by mistake)
- [ ] At what point is the board "done" for the day?
- [ ] What reports or exports does anyone need at the end of the day?
- [ ] Are there any pain points with the current app that I haven't mentioned?

**Notes from meeting:**
> _(fill in during meeting)_

---

## 6. Zone Structure

**Questions:**
- [ ] How many zones are there? (Legacy had 6)
- [ ] Does the number of zones change between elections?
- [ ] Do zones have names or just numbers?
- [ ] How are locations assigned to zones? (Part of the CSV import?)

**Notes from meeting:**
> _(fill in during meeting)_

---

## 7. Nice-to-Haves (Show and Ask)

After covering the essentials, show these planned features and get reactions:

- [ ] **Interactive map** — color-coded pins showing location status. Useful or unnecessary?
- [ ] **Test mode** — practice with fake data before election day. Would anyone use this?
- [ ] **Mobile view** — dashboard on phones/tablets for field staff. Needed?
- [ ] **Status reversal warnings** — popup confirmation when un-doing a status. Annoying or helpful?
- [ ] **Analytics** — progress bars per zone, percentage complete. Useful for supervisors?

**Notes from meeting:**
> _(fill in during meeting)_

---

## Action Items After Meeting

- [ ] Finalize milestone list and order
- [ ] Confirm role names and permissions
- [ ] Get sample CSV files for current election format
- [ ] Confirm contact data format
- [ ] Update `reference/new-features.md` with any changes

---

*This document is part of the GreenBubbleV2 rebuild. See `reference/` folder for full context.*