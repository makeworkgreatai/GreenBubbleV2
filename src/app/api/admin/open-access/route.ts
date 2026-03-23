import { NextResponse } from "next/server";
import { withRole } from "@/lib/middleware";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const CONFIG_PATH = join(process.cwd(), ".open-access");

function isEnabled(): boolean {
  try {
    return existsSync(CONFIG_PATH) && readFileSync(CONFIG_PATH, "utf8").trim() === "true";
  } catch {
    return false;
  }
}

// GET — check if open access is enabled
export const GET = withRole("SUPERVISOR", async () => {
  return NextResponse.json({ enabled: isEnabled() });
});

// POST — toggle open access
export const POST = withRole("ADMIN", async () => {
  const current = isEnabled();
  writeFileSync(CONFIG_PATH, current ? "false" : "true", "utf8");
  return NextResponse.json({ enabled: !current });
});
