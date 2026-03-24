"use client";

import { useState, useEffect, useRef } from "react";
import { MobileAdminNav } from "@/components/mobile-admin-nav";

interface LocationPhone {
  id: number;
  pollId: string | null;
  name: string;
  smsPhone: string | null;
  zone: { number: number; name: string };
}

export default function CellManagementPage() {
  const [locations, setLocations] = useState<LocationPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [sortCol, setSortCol] = useState<"name" | "pollId" | "zone" | "phone">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchData() {
    const res = await fetch("/api/admin/sms-phones");
    if (res.ok) {
      const data = await res.json();
      setLocations(data.locations);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = locations.filter((loc) => {
    if (filter === "assigned" && !loc.smsPhone) return false;
    if (filter === "unassigned" && loc.smsPhone) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !loc.name.toLowerCase().includes(q) &&
        !(loc.pollId || "").toLowerCase().includes(q) &&
        !(loc.smsPhone || "").includes(q)
      ) return false;
    }
    return true;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortCol === "pollId") cmp = (a.pollId || "").localeCompare(b.pollId || "", undefined, { numeric: true });
    else if (sortCol === "name") cmp = a.name.localeCompare(b.name);
    else if (sortCol === "zone") cmp = a.zone.number - b.zone.number;
    else if (sortCol === "phone") cmp = (a.smsPhone || "").localeCompare(b.smsPhone || "");
    return sortDir === "asc" ? cmp : -cmp;
  });

  function handleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sortIcon = (col: typeof sortCol) => sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕";

  const assignedCount = locations.filter((l) => l.smsPhone).length;
  const totalCount = locations.length;

  async function handleSave(locationId: number, force?: boolean) {
    const res = await fetch("/api/admin/sms-phones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, phone: editValue, force }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.duplicate && !force) {
        if (confirm(`${data.error}\n\nMove this number to the new location?`)) {
          await handleSave(locationId, true);
        }
        return;
      }
      alert(data.error || "Failed to save");
      return;
    }
    setEditingId(null);
    fetchData();
  }

  async function handleClear(locationId: number) {
    await fetch("/api/admin/sms-phones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, phone: "" }),
    });
    fetchData();
  }

  async function handleClearAll() {
    if (!confirm(`Clear ALL ${assignedCount} phone assignments?`)) return;
    for (const loc of locations.filter((l) => l.smsPhone)) {
      await fetch("/api/admin/sms-phones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: loc.id, phone: "" }),
      });
    }
    fetchData();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
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
        if (r) alert(`${r.updated} phones assigned${r.errors.length ? `, ${r.errors.length} errors` : ""}`);
        fetchData();
      }
    } catch {
      alert("Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  function handleExport() {
    const header = "poll_id,name,zone,phone";
    const rows = locations.map((l) =>
      `${l.pollId || ""},${csvEscape(l.name)},${l.zone.number},${l.smsPhone || ""}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sms-phone-assignments.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvEscape(val: string): string {
    if (val.includes(",") || val.includes('"')) return `"${val.replace(/"/g, '""')}"`;
    return val;
  }

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return raw;
  }

  return (
    <>
    <MobileAdminNav />
    <main className="max-w-[1200px] mx-auto p-4 md:p-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black">Cell Management</h1>
          <p className="text-xs md:text-sm text-gray-500">
            {assignedCount} of {totalCount} locations have an assigned phone
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="px-3 md:px-4 py-2 rounded-md bg-pink-600 text-white text-xs md:text-sm font-bold hover:bg-pink-700 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import CSV"}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleImport} />
          <button
            onClick={handleExport}
            className="px-3 md:px-4 py-2 rounded-md border text-xs md:text-sm font-bold hover:bg-gray-100"
          >
            Export CSV
          </button>
          {assignedCount > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 md:px-4 py-2 rounded-md border border-red-300 text-red-600 text-xs md:text-sm font-bold hover:bg-red-50"
            >
              Clear All
            </button>
          )}
          <a href="/" className="px-3 md:px-4 py-2 rounded-md border text-xs md:text-sm font-bold hover:bg-gray-100">
            Back to Dashboard
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, poll ID, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full md:w-72 rounded-md border px-3 text-sm"
        />
        <div className="flex gap-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="h-9 rounded-md border px-3 text-sm">
            <option value="all">All ({totalCount})</option>
            <option value="assigned">Assigned ({assignedCount})</option>
            <option value="unassigned">Unassigned ({totalCount - assignedCount})</option>
          </select>
          <span className="flex items-center text-sm text-gray-500">{filtered.length} shown</span>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="px-3 py-8 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-gray-500">No locations found</div>
        ) : (
          filtered.map((loc) => (
            <div key={loc.id} className="border rounded-lg p-3 bg-white">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{loc.name}</div>
                  <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                    <span className="font-mono">{loc.pollId || "—"}</span>
                    <span>·</span>
                    <span>{loc.zone.name}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {loc.smsPhone && (
                    <button
                      onClick={() => handleClear(loc.id)}
                      className="px-2 py-1 rounded text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="text-sm">
                {editingId === loc.id ? (
                  <div className="flex gap-1">
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSave(loc.id); if (e.key === "Escape") setEditingId(null); }}
                      placeholder="(216) 555-1234"
                      autoFocus
                      className="h-7 flex-1 rounded border px-2 text-sm font-mono"
                    />
                    <button onClick={() => handleSave(loc.id)} className="text-xs text-emerald-600 font-bold">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                  </div>
                ) : loc.smsPhone ? (
                  <span
                    className="font-mono font-bold text-pink-700 cursor-pointer hover:underline"
                    onClick={() => { setEditingId(loc.id); setEditValue(loc.smsPhone || ""); }}
                  >
                    {formatPhone(loc.smsPhone)}
                  </span>
                ) : (
                  <span
                    className="text-gray-400 cursor-pointer hover:text-gray-600"
                    onClick={() => { setEditingId(loc.id); setEditValue(""); }}
                  >
                    Tap to assign phone
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr className="text-left">
              <th className="px-3 py-2 font-bold w-20 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("pollId")}>Poll ID{sortIcon("pollId")}</th>
              <th className="px-3 py-2 font-bold cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("name")}>Location{sortIcon("name")}</th>
              <th className="px-3 py-2 font-bold w-20 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("zone")}>Zone{sortIcon("zone")}</th>
              <th className="px-3 py-2 font-bold w-48 cursor-pointer hover:bg-gray-200 select-none" onClick={() => handleSort("phone")}>SMS Phone{sortIcon("phone")}</th>
              <th className="px-3 py-2 font-bold text-right w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-500">No locations found</td></tr>
            ) : (
              filtered.map((loc) => (
                <tr key={loc.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-600">{loc.pollId || "—"}</td>
                  <td className="px-3 py-2 font-medium">{loc.name}</td>
                  <td className="px-3 py-2 text-gray-600">{loc.zone.name}</td>
                  <td className="px-3 py-2">
                    {editingId === loc.id ? (
                      <div className="flex gap-1">
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSave(loc.id); if (e.key === "Escape") setEditingId(null); }}
                          placeholder="(216) 555-1234"
                          autoFocus
                          className="h-7 w-36 rounded border px-2 text-sm font-mono"
                        />
                        <button onClick={() => handleSave(loc.id)} className="text-xs text-emerald-600 font-bold">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">Cancel</button>
                      </div>
                    ) : loc.smsPhone ? (
                      <span
                        className="font-mono font-bold text-pink-700 cursor-pointer hover:underline"
                        onClick={() => { setEditingId(loc.id); setEditValue(loc.smsPhone || ""); }}
                      >
                        {formatPhone(loc.smsPhone)}
                      </span>
                    ) : (
                      <span
                        className="text-gray-400 cursor-pointer hover:text-gray-600"
                        onClick={() => { setEditingId(loc.id); setEditValue(""); }}
                      >
                        Click to assign
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {loc.smsPhone && (
                      <button
                        onClick={() => handleClear(loc.id)}
                        className="px-2 py-1 rounded text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        Clear
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Help */}
      <div className="mt-6 rounded-lg border bg-gray-50 p-4">
        <h3 className="font-bold text-sm mb-2">How SMS Auth Works</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <div>Assign a cell phone to a location — only that phone can text status updates for it.</div>
          <div>Unassigned locations accept texts from any phone.</div>
          <div><span className="font-bold">CSV format:</span> <span className="font-mono text-xs">poll_id,phone</span></div>
        </div>
      </div>
    </main>
    </>
  );
}
