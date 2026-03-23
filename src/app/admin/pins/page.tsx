"use client";

import { useState, useEffect, useRef } from "react";

interface UserAccount {
  id: number;
  displayName: string;
  role: string;
  zoneId: number | null;
  zone: { number: number; name: string } | null;
  pinMode: string;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  auditCount: number;
  statusUpdates: number;
  isExpired: boolean;
}

interface GeneratedPin {
  pin: string;
  displayName: string;
}

const ROLES = [
  { value: "SUPERVISOR", label: "Supervisors", color: "border-purple-400 bg-purple-50", badge: "bg-purple-100 text-purple-700", modes: ["individual", "open", "shared"] },
  { value: "ZONE_CAPTAIN", label: "Zone Captains", color: "border-blue-400 bg-blue-50", badge: "bg-blue-100 text-blue-700", modes: ["individual", "open", "shared"] },
  { value: "PHONE_OPERATOR", label: "Phone Operators", color: "border-amber-400 bg-amber-50", badge: "bg-amber-100 text-amber-700", modes: ["individual", "open", "shared"] },
  { value: "VIEWER", label: "Viewers", color: "border-gray-400 bg-gray-50", badge: "bg-gray-200 text-gray-700", modes: ["individual", "open", "shared", "open_access"] },
];

const MODE_INFO: Record<string, { label: string; desc: string }> = {
  individual: { label: "Individual", desc: "Each person gets a unique PIN with their name" },
  open: { label: "Open", desc: "Shared PINs, each person types their name on login" },
  shared: { label: "Shared", desc: "One PIN for the whole group" },
  open_access: { label: "Open Access", desc: "Skip login — share the /view link and anyone can watch the board (read only)" },
};

const ZONES = [
  { value: 1, label: "Zone 1" },
  { value: 2, label: "Zone 2" },
  { value: 3, label: "Zone 3" },
  { value: 4, label: "Zone 4" },
  { value: 5, label: "Zone 5" },
  { value: 6, label: "Zone 6" },
];

export default function AccountManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [resetPinResult, setResetPinResult] = useState<{ id: number; pin: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [openAccess, setOpenAccess] = useState(false);
  const loginFileRef = useRef<HTMLInputElement>(null);

  const [genRole, setGenRole] = useState("");
  const [genCount, setGenCount] = useState(5);
  const [genZoneId, setGenZoneId] = useState(1);
  const [genPinMode, setGenPinMode] = useState("open");
  const [genPins, setGenPins] = useState<GeneratedPin[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  }

  async function fetchOpenAccess() {
    const res = await fetch("/api/admin/open-access");
    if (res.ok) {
      const data = await res.json();
      setOpenAccess(data.enabled);
    }
  }

  useEffect(() => { fetchUsers(); fetchOpenAccess(); }, []);

  function usersForRole(role: string) {
    return users.filter((u) => u.role === role);
  }

  function activeCount(role: string) {
    return usersForRole(role).filter((u) => u.active && !u.isExpired).length;
  }

  function roleMode(role: string): string {
    if (role === "VIEWER" && openAccess) return "open_access";
    const roleUsers = usersForRole(role);
    if (roleUsers.length === 0) return "none";
    const modes = new Set(roleUsers.map((u) => u.pinMode));
    if (modes.has("shared")) return "shared";
    if (modes.has("open")) return "open";
    return "individual";
  }

  async function handleToggleActive(user: UserAccount) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "active", value: String(!user.active) }),
    });
    fetchUsers();
  }

  async function handleDelete(user: UserAccount) {
    if (!confirm(`Delete "${user.displayName}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Delete failed");
    }
  }

  async function handleResetPin(user: UserAccount) {
    if (!confirm(`Reset PIN for "${user.displayName}"?`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "resetPin", value: "" }),
    });
    if (res.ok) {
      const data = await res.json();
      setResetPinResult({ id: user.id, pin: data.pin });
    }
  }

  async function handleSaveEdit(userId: number) {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "displayName", value: editValue }),
    });
    setEditingId(null);
    fetchUsers();
  }

  async function handleExpireAll() {
    if (!confirm("This will expire ALL non-admin PINs. Are you sure?")) return;
    const res = await fetch("/api/admin/pins/expire-all", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      alert(`${data.expired} PINs expired.`);
      fetchUsers();
    }
  }

  async function handleToggleOpenAccess(enabled: boolean) {
    const res = await fetch("/api/admin/open-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) setOpenAccess(enabled);
  }

  function openGenerator(role: string) {
    setGenRole(role);
    setGenPinMode(roleMode(role) === "shared" ? "shared" : "open");
    setGenPins([]);
    setGenCount(5);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenLoading(true);
    try {
      const res = await fetch("/api/admin/pins/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: genRole,
          count: genPinMode === "shared" ? 1 : genCount,
          zoneId: genRole === "ZONE_CAPTAIN" ? genZoneId : undefined,
          pinMode: genPinMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setGenPins(data.pins);
      fetchUsers();
    } catch {
      alert("Failed to generate PINs");
    } finally {
      setGenLoading(false);
    }
  }

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const roleLabel = ROLES.find((r) => r.value === genRole)?.label || genRole;
    win.document.write(`<html><head><title>PIN Sheet</title><style>body{font-family:system-ui,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:8px 12px;text-align:left}th{background:#f5f5f5;font-weight:600}.header{font-size:20px;font-weight:bold;margin-bottom:4px}.sub{color:#666;font-size:14px}</style></head><body><div class="header">Green Bubbles — PIN Sheet</div><div class="sub">${roleLabel} | ${genPinMode} | Generated: ${new Date().toLocaleDateString("en-US", { timeZone: "America/New_York" })}</div>${content.innerHTML}<script>window.print();window.close();</script></body></html>`);
    win.document.close();
  }

  async function handleImportLogins(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const res = await fetch("/api/admin/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Import failed"); }
      else {
        const r = data.results?.[0];
        if (r) alert(`${r.created} created, ${r.skipped} skipped${r.errors.length ? `, ${r.errors.length} errors` : ""}`);
        fetchUsers();
      }
    } catch { alert("Import failed"); }
    finally { setImporting(false); e.target.value = ""; }
  }

  function statusDot(user: UserAccount) {
    if (!user.active) return <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" title="Deactivated" />;
    if (user.isExpired) return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" title="Expired" />;
    return <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Active" />;
  }

  const adminUsers = users.filter((u) => u.role === "ADMIN");
  const totalActive = users.filter((u) => u.active && !u.isExpired).length;

  if (loading) return <main className="max-w-[1200px] mx-auto p-6"><p className="text-gray-500">Loading...</p></main>;

  return (
    <main className="max-w-[1200px] mx-auto p-6 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Account Management</h1>
          <p className="text-sm text-gray-500">{totalActive} active accounts across {users.length} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loginFileRef.current?.click()} disabled={importing} className="px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 disabled:opacity-50">
            {importing ? "Importing..." : "Import Logins"}
          </button>
          <input ref={loginFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportLogins} />
          <button onClick={handleExpireAll} className="px-4 py-2 rounded-md border border-red-300 text-red-600 text-sm font-bold hover:bg-red-50">Expire All PINs</button>
          <a href="/" className="px-4 py-2 rounded-md border text-sm font-bold hover:bg-gray-100">Back to Dashboard</a>
        </div>
      </div>

      {resetPinResult && (
        <div className="mb-4 px-4 py-3 rounded-md bg-emerald-50 border border-emerald-300 flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-emerald-800">New PIN: </span>
            <span className="font-mono text-xl font-black text-emerald-700">{resetPinResult.pin}</span>
            <span className="text-sm text-emerald-600 ml-2">— write this down, it cannot be shown again</span>
          </div>
          <button onClick={() => setResetPinResult(null)} className="text-sm font-bold text-emerald-700 hover:underline">Dismiss</button>
        </div>
      )}

      {adminUsers.length > 0 && (
        <div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-black text-red-700">Admins</div>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">{adminUsers.length}</span>
          </div>
          <div className="space-y-1">
            {adminUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-2 text-sm">
                {statusDot(u)}
                <span className="font-bold">{u.displayName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {ROLES.map((role) => {
          const roleUsers = usersForRole(role.value);
          const mode = roleMode(role.value);
          const active = activeCount(role.value);

          return (
            <div key={role.value} className={`rounded-lg border-2 p-4 ${role.color}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black">{role.label}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${role.badge}`}>{active} active</span>
                </div>
                {mode !== "open_access" && (
                  <button onClick={() => openGenerator(role.value)} className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-bold hover:bg-gray-800">+ Generate PINs</button>
                )}
              </div>

              {/* Mode toggles */}
              <div className="flex gap-2 mb-3">
                {role.modes.map((m) => {
                  const info = MODE_INFO[m];
                  const isActive = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => { if (m === "open_access") handleToggleOpenAccess(!openAccess); }}
                      className={`flex-1 rounded-lg border-2 p-2.5 text-center transition-all ${
                        isActive ? "border-green-500 bg-green-50 shadow-sm" : "border-gray-200 bg-white opacity-40 hover:opacity-60"
                      } ${m === "open_access" ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="text-xs font-black">{info.label}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{info.desc}</div>
                    </button>
                  );
                })}
              </div>

              {role.value === "VIEWER" && openAccess && (
                <div className="mb-3 px-3 py-2 rounded-md bg-green-100 border border-green-300 text-sm text-green-800">
                  Open Access is <span className="font-black">ON</span> — anyone can view the dashboard at <span className="font-mono text-xs bg-white px-1 rounded">/view</span> without logging in.
                  <button onClick={() => handleToggleOpenAccess(false)} className="ml-2 text-xs font-bold underline hover:text-green-600">Turn off</button>
                </div>
              )}

              {role.value === "VIEWER" && (
                <div className="mb-3 px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800 flex items-center justify-between">
                  <span>Want to see the dashboard without being able to change anything?</span>
                  <a href="/view" target="_blank" className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">Preview as Viewer</a>
                </div>
              )}

              {genRole === role.value && (
                <div className="mb-3 p-3 rounded-lg bg-white border">
                  <form onSubmit={handleGenerate} className="space-y-3">
                    <div className="flex gap-2">
                      {["individual", "open", "shared"].map((m) => (
                        <label key={m} className={`flex-1 rounded-md border p-2 cursor-pointer text-center transition-colors ${genPinMode === m ? "border-green-500 bg-green-50" : "hover:bg-gray-50"}`}>
                          <input type="radio" name="mode" value={m} checked={genPinMode === m} onChange={() => setGenPinMode(m)} className="sr-only" />
                          <div className="text-xs font-bold capitalize">{m}</div>
                          <div className="text-[10px] text-gray-500">{m === "individual" ? "Pre-named" : m === "open" ? "Name on login" : "One PIN for all"}</div>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-3 items-end">
                      {genPinMode !== "shared" && (
                        <div>
                          <label className="text-xs font-bold text-gray-600">Count</label>
                          <input type="number" min={1} max={100} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} className="mt-1 flex h-9 w-20 rounded-md border px-3 text-sm" />
                        </div>
                      )}
                      {role.value === "ZONE_CAPTAIN" && (
                        <div>
                          <label className="text-xs font-bold text-gray-600">Zone</label>
                          <select value={genZoneId} onChange={(e) => setGenZoneId(Number(e.target.value))} className="mt-1 flex h-9 rounded-md border px-3 text-sm">
                            {ZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                          </select>
                        </div>
                      )}
                      <button type="submit" disabled={genLoading} className="h-9 px-4 rounded-md bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">{genLoading ? "..." : "Generate"}</button>
                      <button type="button" onClick={() => setGenRole("")} className="h-9 px-3 rounded-md border text-sm font-bold hover:bg-gray-100">Cancel</button>
                    </div>
                  </form>
                  {genPins.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold">Generated {genPins.length} PIN{genPins.length > 1 ? "s" : ""}</span>
                        <button onClick={handlePrint} className="px-3 py-1 rounded-md border text-xs font-bold hover:bg-gray-100">Print</button>
                      </div>
                      <div ref={printRef}>
                        <table className="w-full border-collapse text-sm">
                          <thead><tr className="border-b bg-gray-50"><th className="text-left py-2 px-3 font-medium">Name</th><th className="text-left py-2 px-3 font-medium">PIN</th></tr></thead>
                          <tbody>
                            {genPins.map((p, i) => (
                              <tr key={i} className="border-b"><td className="py-2 px-3 text-gray-400 italic">(write name here)</td><td className="py-2 px-3 font-mono font-bold text-lg">{p.pin}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === "open_access" && role.value === "VIEWER" ? (
                <div className="text-sm text-gray-500 italic">No accounts needed — open access is enabled</div>
              ) : roleUsers.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No accounts yet — click Generate PINs to create some</div>
              ) : (
                <div className="space-y-1">
                  {roleUsers.map((user) => (
                    <div key={user.id} className={`flex items-center justify-between py-1.5 px-2 rounded ${!user.active ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-2">
                        {statusDot(user)}
                        {editingId === user.id ? (
                          <div className="flex gap-1">
                            <input value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(user.id); if (e.key === "Escape") setEditingId(null); }} autoFocus className="h-6 w-40 rounded border px-2 text-sm" />
                            <button onClick={() => handleSaveEdit(user.id)} className="text-xs text-green-600 font-bold">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                          </div>
                        ) : (
                          <span className="text-sm font-medium cursor-pointer hover:underline" onClick={() => { setEditingId(user.id); setEditValue(user.displayName); }} title="Click to rename">{user.displayName}</span>
                        )}
                        {user.zone && <span className="text-xs text-gray-500">{user.zone.name}</span>}
                        <span className="text-xs text-gray-400">{user.statusUpdates} updates</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleResetPin(user)} className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100">Reset PIN</button>
                        <button onClick={() => handleToggleActive(user)} className={`px-2 py-0.5 rounded text-xs font-bold ${user.active ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>{user.active ? "Deactivate" : "Activate"}</button>
                        <button onClick={() => handleDelete(user)} className="px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
