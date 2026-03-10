import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GreenBubble</h1>
          <p className="text-muted-foreground text-sm">
            Election Day Polling Location Tracker
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{session.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {session.role.replace("_", " ")}
              {session.zoneId ? ` · Zone ${session.zoneId}` : ""}
            </p>
          </div>
          <LogoutButton />
        </div>
      </div>

      <div className="rounded-lg border p-8 text-center space-y-4">
        <div className="flex gap-3 justify-center">
          <div className="w-5 h-5 rounded-full bg-bubble-done" title="Done" />
          <div className="w-5 h-5 rounded-full bg-bubble-pending" title="Pending" />
          <div className="w-5 h-5 rounded-full bg-bubble-empty border" title="Not started" />
        </div>
        <p className="text-muted-foreground">
          Dashboard coming in Phase 3. You are logged in as <strong>{session.role.replace("_", " ")}</strong>.
        </p>
        {(session.role === "ADMIN" || session.role === "SUPERVISOR") && (
          <a
            href="/admin/pins"
            className="inline-flex h-9 px-4 items-center rounded-md border text-sm font-medium hover:bg-accent"
          >
            Manage PINs
          </a>
        )}
      </div>
    </main>
  );
}
