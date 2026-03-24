"use client";

import { useState, useEffect, useRef } from "react";
import { MobileAdminNav } from "@/components/mobile-admin-nav";

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

const ROLES = [
  { value: "SUPERVISOR", label: "Supervisors", color: "border-purple-400 bg-purple-50", pinBg: "bg-purple-100", pinText: "text-purple-700" },
  { value: "ZONE_CAPTAIN", label: "Zone Captains", color: "border-blue-400 bg-blue-50", pinBg: "bg-blue-100", pinText: "text-blue-700" },
  { value: "PHONE_OPERATOR", label: "Phone Operators", color: "border-amber-400 bg-amber-50", pinBg: "bg-amber-100", pinText: "text-amber-700" },
  { value: "VIEWER", label: "Viewers", color: "border-gray-400 bg-gray-50", pinBg: "bg-gray-100", pinText: "text-gray-700" },
];

export default function AccountManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAccess, setOpenAccess] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newPin, setNewPin] = useState<{ role: string; pin: string } | null>(null);
  const loginFileRef = useRef<HTMLInputElement>(null);

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

  // Find the shared PIN user for a role (if any)
  function sharedUser(role: string) {
    return users.find((u) => u.role === role && u.pinMode === "shared" && u.active);
  }

  async function handleGenerateSharedPin(role: string) {
    const res = await fetch("/api/admin/pins/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, count: 1, pinMode: "shared" }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewPin({ role, pin: data.pins[0].pin });
      fetchUsers();
    }
  }

  async function handleNewPin(role: string) {
    // Expire old shared PINs for this role, then generate new one
    const oldShared = users.filter((u) => u.role === role && u.pinMode === "shared");
    for (const u of oldShared) {
      await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "active", value: "false" }),
      });
    }
    await handleGenerateSharedPin(role);
  }

  const [expiryPicker, setExpiryPicker] = useState<{ userId: number; value: string } | null>(null);

  async function handleSaveExpiry() {
    if (!expiryPicker) return;
    await fetch(`/api/admin/users/${expiryPicker.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "expiresAt", value: expiryPicker.value }),
    });
    setExpiryPicker(null);
    fetchUsers();
  }

  async function handleToggleOpenAccess(enabled: boolean) {
    const res = await fetch("/api/admin/open-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) setOpenAccess(enabled);
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

  const roleFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleRoleUpload(role: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { alert("CSV has no data rows"); return; }

      // Parse CSV — expect: username (required), password (optional)
      const header = lines[0].toLowerCase();
      const hasPassword = header.includes("password");
      const rows = lines.slice(1);

      let created = 0;
      for (const row of rows) {
        const cols = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const username = cols[0];
        const password = hasPassword ? cols[1] : "";
        if (!username) continue;

        const res = await fetch("/api/admin/pins/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role,
            count: 1,
            pinMode: "named",
            displayName: username,
            password: password || undefined,
          }),
        });
        if (res.ok) created++;
      }
      alert(`${created} ${role.replace(/_/g, " ").toLowerCase()} accounts created`);
      fetchUsers();
    } catch { alert("Import failed"); }
    finally { setImporting(false); e.target.value = ""; }
  }

  function downloadTemplate(type: string) {
    let csv = "";
    if (type === "users") {
      csv = "username,password\njsmith,\njdoe,\n";
    } else if (type === "users-pw") {
      csv = "username,password\njsmith,mypin123\njdoe,secret456\n";
    } else if (type === "election") {
      csv = "poll_id,location_line_1,location_line_2,city,Zone\n8133,EXAMPLE SCHOOL,123 MAIN ST,CLEVELAND,1\n";
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteUser(user: UserAccount) {
    if (!confirm(`Delete "${user.displayName}"?`)) return;
    await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    fetchUsers();
  }

  function formatExpiry(expiresAt: string | null, isExpired: boolean): string {
    if (!expiresAt) return "No expiry";
    const d = new Date(expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
    return isExpired ? `Expired ${d}` : `Expires ${d}`;
  }

  const adminUsers = users.filter((u) => u.role === "ADMIN");

  if (loading) return <main className="max-w-[1000px] mx-auto p-4"><p className="text-gray-500">Loading...</p></main>;

  return (
    <>
    <MobileAdminNav />
    <main className="max-w-[1000px] mx-auto p-4 md:p-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black">Account Management</h1>
          <p className="text-sm text-gray-500">Shared PINs for each role</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => loginFileRef.current?.click()} disabled={importing} className="px-3 py-2 rounded-md bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50">
            {importing ? "Importing..." : "Import Logins"}
          </button>
          <input ref={loginFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportLogins} />
          <button onClick={() => downloadTemplate("election")} className="px-3 py-2 rounded-md border text-xs font-bold hover:bg-gray-100">Election Template</button>
          <button onClick={handleExpireAll} className="px-3 py-2 rounded-md border border-red-300 text-red-600 text-xs font-bold hover:bg-red-50">Expire All</button>
          <a href="/" className="px-3 py-2 rounded-md border text-xs font-bold hover:bg-gray-100">Dashboard</a>
        </div>
      </div>

      {/* New PIN banner */}
      {newPin && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border-2 border-emerald-400 flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-emerald-800">New {ROLES.find((r) => r.value === newPin.role)?.label} PIN: </span>
            <span className="font-mono text-2xl font-black text-emerald-700 tracking-wider">{newPin.pin}</span>
            <span className="text-sm text-emerald-600 ml-2">— share this with the team</span>
          </div>
          <button onClick={() => setNewPin(null)} className="text-sm font-bold text-emerald-700 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Admin card */}
      {adminUsers.length > 0 && (
        <div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <div className="text-sm font-black text-red-700 mb-2">Admins</div>
          {adminUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span className="font-bold">{u.displayName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Role cards */}
      <div className="space-y-4">
        {ROLES.map((role) => {
          const shared = sharedUser(role.value);
          const allRoleUsers = usersForRole(role.value);
          const uniqueUsers = allRoleUsers.filter((u) => u.pinMode !== "shared");
          const isViewer = role.value === "VIEWER";

          return (
            <div key={role.value} className={`rounded-lg border-2 p-4 ${role.color}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                <span className="text-lg font-black">{role.label}</span>
              </div>

              {/* Shared PIN section */}
              <div className={`rounded-lg border p-3 mb-3 ${role.pinBg}`}>
                {shared ? (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase">Shared PIN</div>
                      <div className="font-mono text-2xl font-black tracking-wider">{newPin?.role === role.value ? newPin.pin : "••••"}</div>
                      <div className={`text-xs font-bold mt-0.5 ${shared.isExpired ? "text-red-600" : "text-gray-500"}`}>
                        {formatExpiry(shared.expiresAt, shared.isExpired)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleNewPin(role.value)} className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-bold hover:bg-gray-800">New PIN</button>
                      <button onClick={() => setExpiryPicker({ userId: shared.id, value: shared.expiresAt ? shared.expiresAt.split("T")[0] : "" })} className="px-3 py-1.5 rounded-md border text-xs font-bold hover:bg-white/50">Set Expiry</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="text-sm text-gray-600">No shared PIN set</div>
                    <button onClick={() => handleGenerateSharedPin(role.value)} className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 self-start">Generate Shared PIN</button>
                  </div>
                )}
              </div>

              {/* Open Access toggle for viewers */}
              {isViewer && (
                <div className={`rounded-lg border p-3 mb-3 ${openAccess ? "bg-green-100 border-green-300" : "bg-gray-100 border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase">Open Access</div>
                      <div className="text-sm text-gray-700">Anyone can view at <span className="font-mono text-xs bg-white px-1 rounded">/view</span> — no login needed</div>
                    </div>
                    <button
                      onClick={() => handleToggleOpenAccess(!openAccess)}
                      className={`w-12 h-7 rounded-full relative transition-colors ${openAccess ? "bg-green-500" : "bg-gray-300"}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-1 transition-all ${openAccess ? "left-6" : "left-1"}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Upload users for this role */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  onClick={() => roleFileRefs.current[role.value]?.click()}
                  disabled={importing}
                  className="px-3 py-1.5 rounded-md border text-xs font-bold hover:bg-white/50 disabled:opacity-50"
                >
                  Upload Users CSV
                </button>
                <input
                  ref={(el) => { roleFileRefs.current[role.value] = el; }}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleRoleUpload(role.value, e)}
                />
                <button
                  onClick={() => downloadTemplate("users")}
                  className="px-3 py-1.5 rounded-md text-xs font-bold text-gray-500 hover:text-gray-700 hover:underline"
                >
                  Download Template
                </button>
              </div>

              {/* Individual/imported users */}
              {uniqueUsers.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase mb-2">Individual Accounts ({uniqueUsers.length})</div>
                  <div className="space-y-1">
                    {uniqueUsers.map((user) => (
                      <div key={user.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-1 py-1.5 px-2 rounded ${!user.active || user.isExpired ? "opacity-50" : ""}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${!user.active ? "bg-gray-400" : user.isExpired ? "bg-red-400" : "bg-green-500"}`} />
                          <span className="text-sm font-medium truncate">{user.displayName}</span>
                          {user.zone && <span className="text-xs text-gray-500 shrink-0">{user.zone.name}</span>}
                        </div>
                        <div className="flex gap-1 ml-4 md:ml-0">
                          <button onClick={() => handleDeleteUser(user)} className="px-2 py-1 rounded text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Expiry date picker modal */}
      {expiryPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setExpiryPicker(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black mb-3">Set PIN Expiry</h3>
            <input
              type="date"
              value={expiryPicker.value}
              onChange={(e) => setExpiryPicker({ ...expiryPicker, value: e.target.value })}
              className="w-full h-11 rounded-lg border-2 border-gray-200 px-3 text-sm font-medium focus:border-emerald-500 focus-visible:outline-none"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={handleSaveExpiry} className="flex-1 h-10 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">
                {expiryPicker.value ? "Set Date" : "Remove Expiry"}
              </button>
              <button onClick={() => setExpiryPicker(null)} className="h-10 px-4 rounded-lg border text-sm font-bold hover:bg-gray-100">Cancel</button>
            </div>
            {expiryPicker.value && (
              <button onClick={() => setExpiryPicker({ ...expiryPicker, value: "" })} className="w-full mt-2 text-xs text-red-600 font-bold hover:underline">
                Remove expiry (PIN never expires)
              </button>
            )}
          </div>
        </div>
      )}
    </main>
    </>
  );
}
