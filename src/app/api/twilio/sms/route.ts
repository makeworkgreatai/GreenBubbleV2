import { db } from "@/lib/db";
import { broadcast } from "@/lib/events";

export async function POST(req: Request) {
  const formData = await req.formData();
  const body = (formData.get("Body") as string || "").trim();
  const from = (formData.get("From") as string || "").trim();

  const reply = await handleMessage(body, from);
  return twiml(reply);
}

async function handleMessage(body: string, from: string): Promise<string> {
  const parts = body.toUpperCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Text HELP for commands.";

  const cmd = parts[0];
  const normalizedFrom = from.replace(/\D/g, "").slice(-10);

  // Find location assigned to this phone (if any)
  const allAssigned = await db.location.findMany({
    where: { smsPhone: { not: null } },
    include: { statuses: { include: { milestone: true } } },
  });
  const myLocation = allAssigned.find(
    (l) => l.smsPhone && l.smsPhone.replace(/\D/g, "").slice(-10) === normalizedFrom
  ) || null;

  // HELP
  if (cmd === "HELP" || cmd === "?") {
    const milestones = await db.statusMilestone.findMany({ orderBy: { displayOrder: "asc" } });
    const list = milestones.map((m) => `${m.displayOrder}=${m.label}`).join(", ");
    let msg = `Green Bubbles Commands:\n\n`;
    if (myLocation) {
      msg += `Your location: ${myLocation.name} (${myLocation.pollId})\n\n`;
      msg += `UPDATE: 1 2 3\nUNDO: U1 U2\nSTATUS: S\n\n`;
    } else {
      msg += `UPDATE: <poll_id> 1 2 3\nUNDO: <poll_id> U1 U2\nSTATUS: S <poll_id>\n\n`;
    }
    msg += `Milestones: ${list}`;
    return msg;
  }

  // STATUS — "S" (assigned phone) or "S <poll_id>"
  if (cmd === "S" || cmd === "STATUS") {
    let location = myLocation;
    if (parts[1]) {
      location = await db.location.findUnique({
        where: { pollId: parts[1] },
        include: { statuses: { include: { milestone: true } } },
      });
    }
    if (!location) {
      return myLocation
        ? `Text S for your location status.`
        : `Usage: S <poll_id>`;
    }
    const lines = location.statuses
      .sort((a, b) => a.milestone.displayOrder - b.milestone.displayOrder)
      .map((s) => `${s.milestone.displayOrder}. ${s.milestone.label}: ${s.value ? "GREEN" : "RED"}`);
    return `${location.name} (${location.pollId})\n${lines.join("\n")}`;
  }

  // Determine if this is shorthand (assigned phone, just milestone numbers) or full format
  const firstIsMilestone = /^[uU]?\d$/.test(parts[0]);

  let location: typeof myLocation;
  let milestoneNumbers: string[];

  if (firstIsMilestone && myLocation) {
    // Shorthand: "1 2 3" or "U1 U2"
    location = myLocation;
    milestoneNumbers = parts;
  } else {
    // Full format: "<poll_id> 1 2 3"
    const pollId = parts[0];
    if (!pollId || !/^\d+$/.test(pollId)) {
      if (myLocation) {
        return `${myLocation.name} (${myLocation.pollId})\nText milestone numbers: 1 2 3\nText S for status.`;
      }
      return `Unknown command. Text HELP for instructions.`;
    }

    location = await db.location.findUnique({
      where: { pollId },
      include: { statuses: { include: { milestone: true } } },
    });

    if (!location) return `Location ${pollId} not found.`;

    // Auth check — if location has an assigned phone, only that phone can update
    if (location.smsPhone) {
      const assigned = location.smsPhone.replace(/\D/g, "").slice(-10);
      if (normalizedFrom !== assigned) {
        return `Not authorized for location ${pollId}.`;
      }
    }

    milestoneNumbers = parts.slice(1);
  }

  if (!location) return `Unknown command. Text HELP for instructions.`;

  if (milestoneNumbers.length === 0) {
    return `${location.name} (${location.pollId})\nText milestone numbers: 1 2 3`;
  }

  const milestones = await db.statusMilestone.findMany({ orderBy: { displayOrder: "asc" } });
  const msMap = new Map(milestones.map((m) => [m.displayOrder, m]));
  const results: string[] = [];

  for (const num of milestoneNumbers) {
    const isUndo = num.startsWith("U");
    const msNum = parseInt(isUndo ? num.slice(1) : num);

    const milestone = msMap.get(msNum);
    if (!milestone) {
      results.push(`#${num}: invalid`);
      continue;
    }

    const status = location.statuses.find((s) => s.milestoneId === milestone.id);
    if (!status) {
      results.push(`#${msNum}: not found`);
      continue;
    }

    const newValue = !isUndo;

    if (status.value === newValue) {
      results.push(`${milestone.label}: already ${newValue ? "GREEN" : "RED"}`);
      continue;
    }

    const updated = await db.locationStatus.update({
      where: { id: status.id },
      data: { value: newValue, updatedAt: new Date() },
      include: { updatedByUser: { select: { displayName: true } } },
    });

    await db.auditLog.create({
      data: {
        locationId: location.id,
        field: `milestone_${milestone.id}`,
        oldValue: String(!newValue),
        newValue: String(newValue),
        reason: `SMS from ${from}${isUndo ? " (undo)" : ""}`,
      },
    });

    broadcast({
      type: "status_update",
      locationId: location.id,
      milestoneId: milestone.id,
      value: newValue,
      updatedAt: updated.updatedAt.toISOString(),
      updatedByUser: updated.updatedByUser,
    });

    results.push(`${milestone.label}: ${newValue ? "GREEN" : "RED"}`);
  }

  return `${location.name} (${location.pollId})\n${results.join("\n")}`;
}

function twiml(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
  return new Response(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
