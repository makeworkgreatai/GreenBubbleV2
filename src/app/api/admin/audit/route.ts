import { db } from "@/lib/db";
import { withRole } from "@/lib/middleware";

// GET — download audit logs as CSV (coordinator format)
export const GET = withRole("ADMIN", async () => {
  const logs = await db.auditLog.findMany({
    include: {
      user: { select: { displayName: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Build a map of locationId → { pollId, name } for resolving names
  const locationIds = [...new Set(logs.map((l) => l.locationId).filter(Boolean))] as number[];
  const [locations, milestones] = await Promise.all([
    db.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, pollId: true, name: true },
    }),
    db.statusMilestone.findMany(),
  ]);
  const locMap = new Map(locations.map((l) => [l.id, l]));
  const msMap = new Map(milestones.map((m) => [String(m.id), m.label.replace(/ /g, "_")]));

  const count = logs.length;

  function csvEscape(val: string): string {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  function statusLabel(val: string | null): string {
    if (val === "true") return "GREEN";
    if (val === "false") return "RED";
    return val || "";
  }

  function actionLabel(field: string): string {
    if (field.startsWith("milestone_")) {
      const id = field.replace("milestone_", "");
      return msMap.get(id) || "Milestone_" + id;
    }
    if (field === "board_reset") return "Board_Reset";
    if (field === "csv_restore") return "CSV_Restore";
    if (field === "snapshot_restore") return "Snapshot_Restore";
    if (field.startsWith("edit_")) return "Edit_" + field.replace("edit_", "");
    if (field.startsWith("add_")) return "Add_" + field.replace("add_", "");
    if (field.startsWith("delete_")) return "Delete_" + field.replace("delete_", "");
    return field;
  }

  function roleLabel(role: string | undefined): string {
    if (!role) return "System";
    const map: Record<string, string> = {
      "ADMIN": "Admin",
      "SUPERVISOR": "Supervisor",
      "ZONE_CAPTAIN": "Zone Captains",
      "PHONE_OPERATOR": "Phone Operator",
      "VIEWER": "Viewer",
    };
    return map[role] || role;
  }

  function formatDate(d: Date): string {
    return d.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    });
  }

  const headers = ["poll_Id", "location_Name", "action", "status_Old", "status_New", "user_Name", "role", "change_Date", "reason"];
  const rows = logs.map((log) => {
    const loc = log.locationId ? locMap.get(log.locationId) : null;
    return [
      loc?.pollId || (log.locationId ? String(log.locationId) : ""),
      loc?.name || "",
      actionLabel(log.field),
      statusLabel(log.oldValue),
      statusLabel(log.newValue),
      log.user?.displayName || "System",
      roleLabel(log.user?.role),
      formatDate(log.createdAt),
      log.reason || "",
    ].map(csvEscape).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="Green-Bubble-Audit-${timestamp}-${count}entries.csv"`,
    },
  });
});
