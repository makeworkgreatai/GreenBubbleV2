"use client";

import { useEffect, useState } from "react";
import { MobileAdminNav } from "@/components/mobile-admin-nav";
import { utcToEasternLocal } from "@/lib/time";

interface Election {
  id: number;
  name: string;
  isTest: boolean;
  startedAt: string;
  endedAt: string | null;
}

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
        timeZone: "America/New_York",
      })
    : "— (open)";

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  // New election form
  const [name, setName] = useState("");
  const [isTest, setIsTest] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline edit
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ name: string; isTest: boolean; from: string; to: string }>({
    name: "", isTest: false, from: "", to: "",
  });

  async function load() {
    const res = await fetch("/api/admin/elections");
    if (res.ok) setElections((await res.json()).elections);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !from) { alert("Name and start are required"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/elections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), isTest, startedAt: from, endedAt: to || null }),
    });
    setSaving(false);
    if (res.ok) {
      setName(""); setIsTest(false); setFrom(""); setTo("");
      load();
    } else {
      alert((await res.json()).error || "Failed to create");
    }
  }

  function startEdit(el: Election) {
    setEditId(el.id);
    setEdit({
      name: el.name,
      isTest: el.isTest,
      from: utcToEasternLocal(el.startedAt),
      to: el.endedAt ? utcToEasternLocal(el.endedAt) : "",
    });
  }

  async function saveEdit(id: number) {
    const res = await fetch(`/api/admin/elections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: edit.name.trim(), isTest: edit.isTest, startedAt: edit.from, endedAt: edit.to || null }),
    });
    if (res.ok) { setEditId(null); load(); } else { alert("Failed to save"); }
  }

  async function remove(id: number) {
    if (!confirm("Delete this election tag? (Audit data is not affected.)")) return;
    const res = await fetch(`/api/admin/elections/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <>
      <MobileAdminNav />
      <main className="max-w-[1000px] mx-auto p-4 md:p-6 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-black">Manage Elections</h1>
            <p className="text-sm text-gray-500">Tag time ranges as named elections (real or test) to organize the audit log.</p>
          </div>
          <a href="/admin/audit" className="px-3 py-2 rounded-md border text-xs font-bold hover:bg-gray-100">Audit Log</a>
        </div>

        {/* Add election */}
        <form onSubmit={handleCreate} className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4 mb-6">
          <div className="text-sm font-black text-indigo-700 mb-3">Tag a new election</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col text-[10px] font-bold text-gray-500 uppercase">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nov 2025 General"
                className="h-9 rounded-md border px-3 text-sm font-normal normal-case text-black" />
            </label>
            <label className="flex items-center gap-2 text-sm font-bold mt-5 cursor-pointer">
              <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} />
              Test election (tag so it can be filtered out)
            </label>
            <label className="flex flex-col text-[10px] font-bold text-gray-500 uppercase">
              Start
              <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)}
                className="h-9 rounded-md border px-3 text-sm font-normal normal-case text-black" />
            </label>
            <label className="flex flex-col text-[10px] font-bold text-gray-500 uppercase">
              End (optional — leave blank for ongoing)
              <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-md border px-3 text-sm font-normal normal-case text-black" />
            </label>
          </div>
          <button disabled={saving} className="mt-3 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Saving..." : "Add Election"}
          </button>
        </form>

        {/* List */}
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : elections.length === 0 ? (
          <p className="text-gray-500">No elections yet. Tag one above, or clear the board to create one.</p>
        ) : (
          <div className="space-y-2">
            {elections.map((el) => (
              <div key={el.id} className="rounded-lg border p-3">
                {editId === el.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                      className="h-9 rounded-md border px-3 text-sm" />
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input type="checkbox" checked={edit.isTest} onChange={(e) => setEdit({ ...edit, isTest: e.target.checked })} />
                      Test
                    </label>
                    <input type="datetime-local" value={edit.from} onChange={(e) => setEdit({ ...edit, from: e.target.value })}
                      className="h-9 rounded-md border px-3 text-sm" />
                    <input type="datetime-local" value={edit.to} onChange={(e) => setEdit({ ...edit, to: e.target.value })}
                      className="h-9 rounded-md border px-3 text-sm" />
                    <div className="flex gap-2 md:col-span-2">
                      <button onClick={() => saveEdit(el.id)} className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-bold hover:bg-green-700">Save</button>
                      <button onClick={() => setEditId(null)} className="px-3 py-1.5 rounded-md border text-xs font-bold hover:bg-gray-100">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{el.name}</span>
                        {el.isTest && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">TEST</span>}
                        {!el.endedAt && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-green-100 text-green-700">CURRENT</span>}
                      </div>
                      <div className="text-xs text-gray-500">{fmt(el.startedAt)} → {fmt(el.endedAt)}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(el)} className="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100">Edit</button>
                      <button onClick={() => remove(el.id)} className="px-2 py-1 rounded text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
