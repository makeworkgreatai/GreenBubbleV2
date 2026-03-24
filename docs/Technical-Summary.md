# Green Bubbles V2 — Technical Summary

## Stack
- **Language:** TypeScript (frontend and backend)
- **Framework:** Next.js 15 (React-based, industry standard)
- **Database:** PostgreSQL 16
- **SMS:** Twilio
- **Real-time:** Server-Sent Events (SSE)

## Architecture
- Single application handles both the web interface and API
- Database stores all locations, statuses, users, and audit logs
- Real-time updates push to all connected browsers instantly
- SMS webhook receives texts and updates the database
- No external dependencies beyond the database and Twilio

## Security
- All passwords/PINs hashed with bcrypt (industry standard)
- Session management via encrypted JWT tokens
- Role-based access control (Admin, Supervisor, Zone Captain, Phone Operator, Viewer)
- Every API endpoint requires authentication
- Every status change logged with user, timestamp, and reason
- Login attempts tracked with IP address and device
- SMS phones locked to specific locations

## Hosting Requirements
- Any server that runs Node.js 18+ and PostgreSQL 16+
- Options: county server, AWS, Azure, Vercel, DigitalOcean
- Estimated cost: $5–20/month for cloud hosting
- Twilio: $1.15/month for phone number + ~$0.01 per text

## Data
- All data is exportable (CSV backup, audit CSV)
- Import system accepts GIS files, contact sheets, and legacy logins
- No data leaves the system except through Twilio for SMS
- Database can run on-premises if required

## Source Code
- Hosted on GitHub (private repository)
- Version controlled with full commit history
- Full codebase accessible for internal review and modification
