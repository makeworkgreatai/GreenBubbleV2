# Green Bubbles — Feature Comparison

## V1 (Legacy) vs V2 (New)

### Dashboard
| Feature | V1 | V2 |
|---------|----|----|
| Status board with bubble indicators | Yes | Yes |
| Real-time updates across all screens | Basic (SignalR, all-or-nothing broadcast) | Granular per-bubble updates via SSE |
| Connection status indicator | No | Yes (green pulse = live, red = reconnecting) |
| Auto-reconnect on connection drop | No | Yes (3 second reconnect) |
| Search locations | No | Yes |
| Sort by any column | No | Yes (name, city, zone, poll ID, contact, completion) |
| Filter by zone | No | Yes |
| Green highlight for completed rows | No | Yes |
| Night mode | No | Yes |
| Column visibility toggles | No | Yes (hide/show Monday, Tuesday, etc.) |
| Mobile responsive view | No | Yes (card-based layout with search) |
| Sticky headers with GPU acceleration | No | Yes |
| Reason required when unmarking status | No | Yes |
| Print stylesheet | No | Yes (landscape, compact) |

### SMS Integration
| Feature | V1 | V2 |
|---------|----|----|
| Text-based status updates | No | Yes |
| Auto-identify location by phone number | No | Yes |
| Shorthand commands (just milestone numbers) | No | Yes |
| Status check via text | No | Yes |
| Help command | No | Yes |
| Undo via text | No | Yes |
| Phone-to-location locking | No | Yes |
| SMS audit logging | No | Yes |

### Election Overview
| Feature | V1 | V2 |
|---------|----|----|
| Overall completion percentage | No | Yes |
| Per-milestone progress bars | No | Yes |
| Per-zone completion breakdown | No | Yes |
| Per-city completion breakdown | No | Yes |
| Click milestone to see remaining/complete locations | No | Yes |
| Filter stats by zone, city, milestone | No | Yes |
| Location search on overview | No | Yes |
| Auto-refresh for TV display (30s) | No | Yes |
| Live activity bar with recent changes | No | Yes |
| Change log with filters | No | Yes |

### User Management
| Feature | V1 | V2 |
|---------|----|----|
| User accounts | ASP.NET Identity (username/password) | PIN-based with shared and individual modes |
| Role-based access | 6 roles, no zone restrictions | 5 roles with zone-level restrictions |
| Viewer/read-only role | No | Yes |
| Open access (no login) for viewers | No | Yes (/view route) |
| Generate PINs in bulk | No | Yes |
| Shared PIN per role | No | Yes |
| Import legacy logins | No | Yes (CSV/XLSX) |
| Reset individual PINs | No | Yes |
| Deactivate/reactivate accounts | No | Yes |
| Expire all PINs at once | No | Yes |
| Role-based cards with mode toggles | No | Yes |

### Cell Phone Management
| Feature | V1 | V2 |
|---------|----|----|
| Assign phones to locations | No | Yes |
| Bulk import via CSV | No | Yes |
| Export assignments | No | Yes |
| Duplicate prevention | No | Yes (with move option) |
| Sort/filter/search | No | Yes |

### Data Import
| Feature | V1 | V2 |
|---------|----|----|
| CSV upload | Yes (5 separate uploads, manual formatting) | Yes (drag and drop all files at once) |
| Auto-detect file type | No | Yes (by column headers) |
| XLSX support | No | Yes |
| Smart merge (don't overwrite with empty) | No | Yes |
| Dependency ordering | No | Yes (locations → precincts → contacts) |
| Per-file result breakdown | No | Yes |
| Error reporting with row numbers | No | Yes |
| VLM combo sheet (locations + contacts in one) | No | Yes |

### Audit & Compliance
| Feature | V1 | V2 |
|---------|----|----|
| Audit trail | Database table not connected to app | Full in-app audit system |
| View audit log | Had to query database directly | Searchable viewer with filters |
| CSV export | Manual database extraction | One-click download in coordinator format |
| Reason tracking for unmarking | No | Yes |
| SMS source tracking | No | Yes |
| Login activity tracking | No | Yes (separate from audit, with IP and device) |
| Forced audit download before data reset | No | Yes |

### Backup & Recovery
| Feature | V1 | V2 |
|---------|----|----|
| Board backup | No | Yes (CSV download) |
| Board restore from backup | No | Yes (CSV upload) |
| Clear election (reset all statuses) | No | Yes (forces audit download first) |
| Delete all locations | No | Yes (forces CSV backup first) |

### Edit Dashboard
| Feature | V1 | V2 |
|---------|----|----|
| Edit location data inline | No | Yes |
| Edit contacts and phones inline | No | Yes |
| Add/remove locations | No | Yes |
| Add/remove phones, precincts, contacts | No | Yes |
| Buffered edits with undo | No | Yes (nothing saves until Apply) |
| Discard all changes | No | Yes |

### Security
| Feature | V1 | V2 |
|---------|----|----|
| API authentication | Several endpoints had no auth | Every endpoint authenticated |
| Password/PIN hashing | ASP.NET Identity | bcrypt |
| Zone-level access restrictions | No | Yes (Zone Captains limited to their zone) |
| Admin page access control | No | Yes (middleware blocks non-admin roles) |
| Login attempt tracking | No | Yes (IP, device, success/fail) |
| Session management | Bearer tokens | Encrypted JWT in httpOnly cookies |

### Technical
| Feature | V1 | V2 |
|---------|----|----|
| Language | C# (.NET Framework 4.6.1) | TypeScript |
| Framework | ASP.NET Web API | Next.js 15 (React) |
| Database | SQL Server (external hosted) | PostgreSQL (self-contained) |
| ORM | Entity Framework 6 (Database First) | Prisma |
| Real-time | SignalR | Server-Sent Events |
| IDE | Visual Studio 2017 | Any editor |
| Mobile support | None | Full responsive + card view |
| SMS | None | Twilio |
| Timezone handling | Not explicit | All timestamps in ET |
