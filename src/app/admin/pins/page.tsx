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
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "ZONE_CAPTAIN", label: "Zone Captain" },
  { value: "PHONE_OPERATOR", label: "Phone Operator" },
  { value: "VIEWER", label: "Viewer" },
];

const ALL_ROLES = [
  { value: "ADMIN", label: "Admin" },
  ...ROLES,
];

const ZONES = [
  { value: 1, label: "Zone 1" },
  { value: 2, label: "Zone 2" },
  { value: 3, label: "Zone 3" },
  { value: 4, label: "Zone 4" },
  { value: 5, label: "Zone 5" },
  { value: 6, label: "Zone 6" },
];

const PIN_MODES = [
  { value: "named", label: "Individual", desc: "Each person gets their own PIN with their name already set" },
  { value: "open", label: "Open", desc: "Each person gets their own PIN and types their name on login" },
  { value: "shared", label: "Shared", desc: "Everyone on this role uses the same PIN" },
];

export default function AccountManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "deactivated">("all");
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editField, setEditField] = useState("");
  const [editValue, setEditValue] = useState("");
  const [resetPinResult, setResetPinResult] = useState<{ id: number; pin: string } | null>(null);

  // Generator state
  const [genRole, setGenRole] = useState("ZONE_CAPTAIN");
  const [genCount, setGenCount] = useState(5);
  const [genZoneId, setGenZoneId] = useState(1);
  const [genPinMode, setGenPinMode] = useState("open");
  const [genExpiry, setGenExpiry] = useState("");
  const [genPins, setGenPins] = useState<GeneratedPin[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const loginFileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter === "active" && (!u.active || u.isExpired)) return false;
    if (statusFilter === "expired" && !u.isExpired) return false;
    if (statusFilter === "deactivated" && u.active) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!u.displayName.toLowerCase().includes(q) && !u.role.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = users.filter((u) => u.active && !u.isExpired).length;
  const expiredCount = users.filter((u) => u.isExpired).length;
  const deactivatedCount = users.filter((u) => !u.active).length;

  async function handleToggleActive(user: UserAccount) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: "active", value: String(!user.active) }),
    });
    if (res.ok) fetchUsers();
  }

  async function handleDelete(user: UserAccount) {
    if (!confirm(`Delete "${user.displayName}" (${user.role.replace(/_/g, " ")})? This cannot be undone.`)) return;
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

  async function handleSaveEdit() {
    if (editingId === null) return;
    const res = await fetch(`/api/admin/users/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: editField, value: editValue }),
    });
    if (res.ok) {
      setEditingId(null);
      fetchUsers();
    }
  }

  function startEdit(user: UserAccount, field: string) {
    setEditingId(user.id);
    setEditField(field);
    if (field === "displayName") setEditValue(user.displayName);
    else if (field === "role") setEditValue(user.role);
    else if (field === "zoneId") setEditValue(user.zoneId ? String(user.zoneId) : "");
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
      if (!res.ok) {
        alert(data.error || "Import failed");
      } else {
        const r = data.results?.[0];
        if (r) {
          alert(`Imported: ${r.created} created, ${r.skipped} skipped${r.errors.length ? `, ${r.errors.length} errors` : ""}`);
        }
        fetchUsers();
      }
    } catch {
      alert("Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenError("");
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
          expiresAt: genExpiry || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setGenError(data.error); return; }
      setGenPins(data.pins);
      fetchUsers();
    } catch {
      setGenError("Failed to generate PINs");
    } finally {
      setGenLoading(false);
    }
  }

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>PIN Sheet</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .header { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
        .sub { color: #666; font-size: 14px; }
      </style></head>
      <body>
        <div class="header">Green Bubbles — PIN Sheet</div>
        <div class="sub">Role: ${genRole.replace(/_/g, " ")} | Mode: ${genPinMode} | Generated: ${new Date().toLocaleDateString()}</div>
        ${content.innerHTML}
        <script>window.print();window.close();</script>
      </body></html>
    `);
    win.document.close();
  }

  function roleColor(role: string) {
    const colors: Record<string, string> = {
      ADMIN: "bg-red-100 text-red-700",
      SUPERVISOR: "bg-purple-100 text-purple-700",
      ZONE_CAPTAIN: "bg-blue-100 text-blue-700",
      PHONE_OPERATOR: "bg-amber-100 text-amber-700",
      VIEWER: "bg-gray-100 text-gray-700",
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  }

  function statusBadge(user: UserAccount) {
    if (!user.active) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-200 text-gray-500">Deactivated</span>;
    if (user.isExpired) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600">Expired</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">Active</span>;
  }

  return (
    <main className="max-w-[1400px] mx-auto p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Account Management</h1>
          <p className="text-sm text-gray-500">
            {users.length} accounts — {activeCount} active, {expiredCount} expired, {deactivatedCount} deactivated
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
          >
            {showGenerator ? "Hide Generator" : "Generate PINs"}
          </button>
          <button
            onClick={() => loginFileRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import Logins"}
          </button>
          <input ref={loginFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportLogins} />
          <button
            onClick={handleExpireAll}
            className="px-4 py-2 rounded-md border border-red-300 text-red-600 text-sm font-bold hover:bg-red-50"
          >
            Expire All PINs
          </button>
          <a href="/" className="px-4 py-2 rounded-md border text-sm font-bold hover:bg-gray-100">
            Back to Dashboard
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-2 mb-4">
        {ALL_ROLES.map((r) => (
          <div key={r.value} className={`px-3 py-1.5 rounded-md text-xs font-bold ${roleColor(r.value)}`}>
            {r.label}: {roleCounts[r.value] || 0}
          </div>
        ))}
      </div>

      {/* PIN Generator Panel */}
      {showGenerator && (
        <div className="border rounded-lg p-4 mb-4 bg-gray-50">
          <h2 className="text-lg font-bold mb-3">Generate New PINs</h2>
          <form onSubmit={handleGenerate} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {PIN_MODES.map((m) => (
                <label
                  key={m.value}
                  className={`flex flex-col gap-1 rounded-md border p-3 cursor-pointer transition-colors ${
                    genPinMode === m.value ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input type="radio" name="genPinMode" value={m.value} checked={genPinMode === m.value} onChange={(e) => setGenPinMode(e.target.value)} className="h-3.5 w-3.5" />
                    <span className="text-sm font-medium">{m.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 pl-5.5">{m.desc}</p>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Role</label>
                <select value={genRole} onChange={(e) => setGenRole(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border px-3 text-sm">
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {genPinMode !== "shared" && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Count</label>
                  <input type="number" min={1} max={100} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} className="mt-1 flex h-9 w-full rounded-md border px-3 text-sm" />
                </div>
              )}
              {genRole === "ZONE_CAPTAIN" && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Zone</label>
                  <select value={genZoneId} onChange={(e) => setGenZoneId(Number(e.target.value))} className="mt-1 flex h-9 w-full rounded-md border px-3 text-sm">
                    {ZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600">Expiry (optional)</label>
                <input type="date" value={genExpiry} onChange={(e) => setGenExpiry(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border px-3 text-sm" />
              </div>
            </div>
            {genError && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{genError}</p>}
            <button type="submit" disabled={genLoading} className="h-9 px-4 rounded-md bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
              {genLoading ? "Generating..." : "Generate"}
            </button>
          </form>

          {genPins.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">Generated {genPins.length} PIN{genPins.length > 1 ? "s" : ""}</h3>
                <button onClick={handlePrint} className="px-3 py-1 rounded-md border text-xs font-bold hover:bg-gray-100">Print Sheet</button>
              </div>
              <div ref={printRef}>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-white">
                      <th className="text-left py-2 px-3 font-medium">Name</th>
                      <th className="text-left py-2 px-3 font-medium">PIN</th>
                      <th className="text-left py-2 px-3 font-medium">Role</th>
                      {genRole === "ZONE_CAPTAIN" && <th className="text-left py-2 px-3 font-medium">Zone</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {genPins.map((p, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 px-3 text-gray-400 italic">(write name here)</td>
                        <td className="py-2 px-3 font-mono font-bold text-lg">{p.pin}</td>
                        <td className="py-2 px-3">{genRole.replace(/_/g, " ")}</td>
                        {genRole === "ZONE_CAPTAIN" && <td className="py-2 px-3">Zone {genZoneId}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 rounded-md border px-3 text-sm"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-9 rounded-md border px-3 text-sm">
          <option value="">All Roles</option>
          {ALL_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-9 rounded-md border px-3 text-sm">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <span className="flex items-center text-sm text-gray-500">{filtered.length} shown</span>
      </div>

      {/* Reset PIN banner */}
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

      {/* Users Table */}
      <div className="border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr className="text-left">
              <th className="px-3 py-2 font-bold">Name</th>
              <th className="px-3 py-2 font-bold">Role</th>
              <th className="px-3 py-2 font-bold">Zone</th>
              <th className="px-3 py-2 font-bold">Mode</th>
              <th className="px-3 py-2 font-bold">Status</th>
              <th className="px-3 py-2 font-bold">Created</th>
              <th className="px-3 py-2 font-bold text-center">Activity</th>
              <th className="px-3 py-2 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500">No accounts found</td></tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className={`border-t hover:bg-gray-50 ${!user.active ? "opacity-50" : ""}`}>
                  {/* Name */}
                  <td className="px-3 py-2">
                    {editingId === user.id && editField === "displayName" ? (
                      <div className="flex gap-1">
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingId(null); }}
                          autoFocus
                          className="h-7 w-40 rounded border px-2 text-sm"
                        />
                        <button onClick={handleSaveEdit} className="text-xs text-emerald-600 font-bold">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                      </div>
                    ) : (
                      <span
                        className="font-medium cursor-pointer hover:underline"
                        onClick={() => startEdit(user, "displayName")}
                        title="Click to edit"
                      >
                        {user.displayName}
                      </span>
                    )}
                  </td>
                  {/* Role */}
                  <td className="px-3 py-2">
                    {editingId === user.id && editField === "role" ? (
                      <div className="flex gap-1">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          className="h-7 rounded border px-2 text-xs"
                        >
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <button onClick={handleSaveEdit} className="text-xs text-emerald-600 font-bold">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                      </div>
                    ) : (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${roleColor(user.role)}`}
                        onClick={() => user.role !== "ADMIN" ? startEdit(user, "role") : undefined}
                        title={user.role !== "ADMIN" ? "Click to change role" : ""}
                      >
                        {user.role.replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                  {/* Zone */}
                  <td className="px-3 py-2 text-gray-600">
                    {user.zone ? user.zone.name : "—"}
                  </td>
                  {/* Mode */}
                  <td className="px-3 py-2 text-gray-600 capitalize">{user.pinMode}</td>
                  {/* Status */}
                  <td className="px-3 py-2">{statusBadge(user)}</td>
                  {/* Created */}
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  {/* Activity */}
                  <td className="px-3 py-2 text-center">
                    <span className="text-xs text-gray-500" title={`${user.auditCount} audit entries, ${user.statusUpdates} status updates`}>
                      {user.statusUpdates} updates
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-3 py-2 text-right">
                    {user.role !== "ADMIN" && (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleResetPin(user)}
                          className="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100"
                          title="Generate a new PIN for this user"
                        >
                          Reset PIN
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            user.active ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-green-50 text-green-600 hover:bg-green-100"
                          }`}
                        >
                          {user.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="px-2 py-1 rounded text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
