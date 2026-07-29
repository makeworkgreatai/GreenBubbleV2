import twilio from "twilio";
import { db } from "@/lib/db";

// Send an outbound SMS via Twilio. No-ops gracefully if Twilio isn't
// configured, so assignment still succeeds even without credentials.
export async function sendSms(to: string, body: string): Promise<{ sent: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    return { sent: false, error: "Twilio not configured (missing env vars)" };
  }
  try {
    const client = twilio(sid, token);
    await client.messages.create({ to, from, body });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "SMS send failed" };
  }
}

// The message a poll worker receives when their phone is assigned to a
// location — tells them the assignment and the texting commands.
export async function buildAssignmentMessage(locationName: string, pollId: string | null): Promise<string> {
  const milestones = await db.statusMilestone.findMany({ orderBy: { displayOrder: "asc" } });
  const legend = milestones.map((m) => `${m.displayOrder}=${m.label}`).join("\n");
  return (
    `This number is now assigned to ${locationName}${pollId ? ` (${pollId})` : ""} for Green Bubbles.\n\n` +
    `Text these numbers as you finish each step:\n${legend}\n\n` +
    `Send several at once: 1 2 3\nUndo a step: U3\nYour status: S\nHelp: HELP`
  );
}
