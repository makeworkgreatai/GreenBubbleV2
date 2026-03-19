"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { LogoutButton } from "./logout-button";
import { BubbleBoard } from "./bubble-board";

const BUBBLE_COLORS = [
  "from-red-400 to-red-600",
  "from-green-400 to-green-600",
  "from-blue-400 to-blue-600",
  "from-yellow-300 to-yellow-500",
  "from-purple-400 to-purple-600",
  "from-pink-400 to-pink-600",
  "from-cyan-400 to-cyan-600",
  "from-orange-400 to-orange-600",
  "from-rose-400 to-rose-600",
  "from-teal-400 to-teal-600",
];

function LogoBubble({ defaultIdx = 1, delay = 0 }: { defaultIdx?: number; delay?: number }) {
  const [colorIdx, setColorIdx] = useState(defaultIdx);
  const [bounce, setBounce] = useState(false);
  function handleClick() {
    setColorIdx((i) => (i + 1) % BUBBLE_COLORS.length);
    setBounce(true);
    setTimeout(() => setBounce(false), 300);
  }
  return (
    <span
      onClick={handleClick}
      className={`inline-block w-7 h-7 rounded-full cursor-pointer border-2 border-white bg-gradient-to-b ${BUBBLE_COLORS[colorIdx]} shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2),0_1px_3px_rgba(0,0,0,0.3)] ${bounce ? "scale-150" : ""}`}
    />
  );
}

async function downloadAuditCSV() {
  const res = await fetch("/api/admin/audit");
  if (!res.ok) return false;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "audit-log.csv";
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

function SaveAuditButton() {
  const [saving, setSaving] = useState(false);
  return (
    <button
      onClick={async () => { setSaving(true); await downloadAuditCSV(); setSaving(false); }}
      disabled={saving}
      className="h-6 px-2 rounded border border-cyan-300 bg-cyan-500/40 text-xs font-bold hover:bg-cyan-500/60 flex items-center disabled:opacity-50"
    >
      {saving ? "Saving..." : "Save Audit"}
    </button>
  );
}

function DeleteLocationsButton({ onDeleted }: { onDeleted: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      // Force CSV backup download before proceeding
      setDownloading(true);
      const res = await fetch("/api/admin/snapshots");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "green-bubbles-backup.csv";
        a.click();
        URL.revokeObjectURL(url);
      }
      setDownloading(false);
      setStep(2);
      return;
    }
    // Final confirm — delete everything
    setDeleting(true);
    const res = await fetch("/api/admin/delete-locations", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      alert(`${data.deleted} locations deleted.`);
      onDeleted();
    }
    setDeleting(false);
    setStep(0);
  }

  function handleCancel() {
    setStep(0);
  }

  if (step === 0) {
    return (
      <button
        onClick={handleConfirm}
        className="h-6 px-2 rounded border border-rose-400 bg-rose-500/40 text-xs font-bold hover:bg-rose-500/60 flex items-center"
      >
        Delete Locations
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCancel}>
      <div className="bg-white text-black rounded-lg shadow-2xl p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
        {step === 1 ? (
          <>
            <h2 className="text-lg font-black text-red-600 mb-2">Delete All Locations</h2>
            <p className="text-sm mb-2">This will permanently delete <span className="font-black">ALL</span> locations, contacts, precincts, and statuses.</p>
            <p className="text-sm mb-4 font-medium">A <span className="font-black">CSV backup</span> will be downloaded automatically before deleting.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancel} className="px-4 py-2 rounded-md border text-sm font-bold hover:bg-gray-100">Cancel</button>
              <button onClick={handleConfirm} disabled={downloading} className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                {downloading ? "Downloading Backup..." : "Download Backup & Continue"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-black text-red-600 mb-2">FINAL WARNING</h2>
            <p className="text-sm mb-2">CSV backup has been saved. You are about to delete <span className="font-black">EVERY</span> location from the board.</p>
            <p className="text-sm font-bold text-red-600 mb-4">This cannot be undone. Are you absolutely sure?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancel} className="px-4 py-2 rounded-md border text-sm font-bold hover:bg-gray-100">No, Go Back</button>
              <button onClick={handleConfirm} disabled={deleting} className="px-4 py-2 rounded-md bg-red-700 text-white text-sm font-black hover:bg-red-800 disabled:opacity-50">
                {deleting ? "Deleting..." : "DELETE EVERYTHING"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ClearElectionButton({ onReset }: { onReset: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [downloading, setDownloading] = useState(false);

  async function handleConfirm() {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      // Force audit CSV download before proceeding
      setDownloading(true);
      const ok = await downloadAuditCSV();
      setDownloading(false);
      if (!ok) return;
      setStep(2);
      return;
    }
    // Final confirm — reset the board
    const res = await fetch("/api/admin/reset-board", { method: "POST" });
    if (res.ok) {
      onReset();
      setStep(0);
    }
  }

  function handleCancel() {
    setStep(0);
  }

  if (step === 0) {
    return (
      <button
        onClick={handleConfirm}
        className="h-6 px-2 rounded border border-red-400 bg-red-600 text-xs font-bold hover:bg-red-700 flex items-center"
      >
        Clear Election
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCancel}>
      <div className="bg-white text-black rounded-lg shadow-2xl p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
        {step === 1 ? (
          <>
            <h2 className="text-lg font-black text-red-600 mb-2">Clear Election Data</h2>
            <p className="text-sm mb-2">This will reset ALL statuses for ALL locations back to incomplete.</p>
            <p className="text-sm mb-4 font-medium">An <span className="font-black">audit log CSV</span> will be downloaded automatically before clearing.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancel} className="px-4 py-2 rounded-md border text-sm font-bold hover:bg-gray-100">Cancel</button>
              <button onClick={handleConfirm} disabled={downloading} className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                {downloading ? "Downloading Audit..." : "Download Audit & Continue"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-black text-red-600 mb-2">FINAL WARNING</h2>
            <p className="text-sm mb-2">Audit log has been saved. You are about to clear the <span className="font-black">ENTIRE</span> election board.</p>
            <p className="text-sm font-bold text-red-600 mb-4">All statuses will be reset. Are you absolutely sure?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancel} className="px-4 py-2 rounded-md border text-sm font-bold hover:bg-gray-100">No, Go Back</button>
              <button onClick={handleConfirm} className="px-4 py-2 rounded-md bg-red-700 text-white text-sm font-black hover:bg-red-800">CLEAR ELECTION</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AuditCacheBar({ children }: { children?: React.ReactNode }) {
  const [count, setCount] = useState<number | null>(null);
  const [oldest, setOldest] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/audit/count")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setCount(d.count); setOldest(d.oldest); } });
  }, []);

  if (count === null) return null;

  const sinceText = oldest ? `since ${new Date(oldest).toLocaleDateString()}` : "";

  return (
    <div className="flex items-center justify-between px-4 py-1 bg-gray-900 text-gray-300 text-xs font-medium">
      <a href="/admin/audit" className="flex items-center gap-2 hover:text-white cursor-pointer">
        <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span>Audit Log: <span className="font-bold text-white">{count.toLocaleString()}</span> entries {sinceText}</span>
        <span className="ml-1 underline">View</span>
      </a>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

function RestoreButton({ onRestored }: { onRestored: () => void }) {
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSaveCSV() {
    const res = await fetch("/api/admin/snapshots");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "green-bubbles-backup.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRestoreCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`Restore from "${file.name}"? This will overwrite the entire board.`)) {
      e.target.value = "";
      return;
    }
    setRestoring(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/snapshots", { method: "POST", body: formData });
    if (res.ok) {
      onRestored();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Restore failed");
    }
    setRestoring(false);
    e.target.value = "";
  }

  return (
    <>
      <button
        onClick={handleSaveCSV}
        className="h-6 px-2 rounded border border-blue-300 bg-blue-500/40 text-xs font-bold hover:bg-blue-500/60 flex items-center"
        title="Download board as CSV backup"
      >
        Save CSV
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={restoring}
        className="h-6 px-2 rounded border border-amber-300 bg-amber-500/40 text-xs font-bold hover:bg-amber-500/60 flex items-center disabled:opacity-50"
        title="Restore board from CSV backup"
      >
        {restoring ? "Restoring..." : "Restore CSV"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleRestoreCSV}
      />
    </>
  );
}

interface SessionPayload {
  userId: number;
  displayName: string;
  role: string;
  zoneId: number | null;
}

interface Milestone {
  id: number;
  key: string;
  label: string;
  displayOrder: number;
}

interface Status {
  id: number;
  locationId: number;
  milestoneId: number;
  value: boolean;
  updatedBy: number | null;
  updatedAt: string;
  updatedByUser: { displayName: string } | null;
}

interface Zone {
  id: number;
  number: number;
  name: string;
}

interface Phone {
  label: string;
  number: string;
}

interface Contact {
  id: number;
  name: string;
  title: string;
  phones: Phone[];
}

interface Location {
  id: number;
  pollId: string | null;
  smsPhone: string | null;
  name: string;
  address: string;
  city: string;
  zoneId: number;
  zone: Zone;
  statuses: Status[];
  precincts: { label: string }[];
  contacts: Contact[];
}

export function DashboardShell({ session }: { session: SessionPayload }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<number | "all">("all");
  const [sortCol, setSortCol] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editMode, setEditMode] = useState(false);
  const editModeRef = useRef(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  // Snapshot of locations when edit mode was entered — for undo
  const [snapshot, setSnapshot] = useState<Location[]>([]);
  // History of local states for step-by-step undo
  const [undoHistory, setUndoHistory] = useState<Location[][]>([]);
  // Track new location IDs created during this edit session (for cleanup on undo-all)
  const [newLocationIds, setNewLocationIds] = useState<Set<number>>(new Set());
  // Track deleted location IDs during this edit session
  const [deletedLocationIds, setDeletedLocationIds] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (!res.ok) return;
    const data = await res.json();
    setMilestones(data.milestones);
    setLocations(data.locations);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep ref in sync for SSE callback
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);

  // Real-time updates via Server-Sent Events
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/events");

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);

          if (event.type === "connected") {
            setLiveConnected(true);
            return;
          }

          // Don't apply remote updates while in edit mode — would conflict with local edits
          if (editModeRef.current) return;

          if (event.type === "status_update") {
            // Granular update — just patch the one status
            setLocations((prev) =>
              prev.map((loc) => {
                if (loc.id !== event.locationId) return loc;
                return {
                  ...loc,
                  statuses: loc.statuses.map((s) =>
                    s.milestoneId === event.milestoneId
                      ? { ...s, value: event.value, updatedAt: event.updatedAt, updatedByUser: event.updatedByUser }
                      : s
                  ),
                };
              })
            );
          } else if (event.type === "board_reset" || event.type === "location_change") {
            // Full refresh for bulk changes
            fetchData();
          }
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        setLiveConnected(false);
        es?.close();
        // Reconnect after 3 seconds
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, [fetchData]);

  // Get unique zones for filter dropdown
  const zones = useMemo(() => {
    const zoneMap = new Map<number, Zone>();
    locations.forEach((loc) => zoneMap.set(loc.zone.number, loc.zone));
    return Array.from(zoneMap.values()).sort((a, b) => a.number - b.number);
  }, [locations]);

  // Filter and sort locations
  const filtered = useMemo(() => {
    let result = locations;

    if (zoneFilter !== "all") {
      result = result.filter((loc) => loc.zone.number === zoneFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (loc) =>
          loc.name.toLowerCase().includes(q) ||
          loc.address.toLowerCase().includes(q) ||
          loc.city.toLowerCase().includes(q) ||
          loc.precincts.some((p) => p.label.toLowerCase().includes(q))
      );
    }

    const monMilestoneIds = milestones.filter((m) => m.displayOrder <= 3).map((m) => m.id);
    const tueMilestoneIds = milestones.filter((m) => m.displayOrder > 3).map((m) => m.id);

    function isDayDone(loc: typeof result[0], ids: number[]) {
      return ids.length > 0 && ids.every((id) => loc.statuses.some((s) => s.milestoneId === id && s.value));
    }

    const effectiveCol = search.trim() ? "name" : sortCol;
    const effectiveDir = search.trim() ? "asc" as const : sortDir;

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (effectiveCol === "pollId") cmp = (a.pollId || "").localeCompare(b.pollId || "");
      else if (effectiveCol === "name") cmp = a.name.localeCompare(b.name);
      else if (effectiveCol === "city") {
        cmp = a.city.localeCompare(b.city);
        if (cmp === 0) cmp = (a.precincts[0]?.label || "").localeCompare(b.precincts[0]?.label || "");
      }
      else if (effectiveCol === "zone") cmp = a.zone.number - b.zone.number;
      else if (effectiveCol === "contact") {
        const aName = a.contacts[0]?.name || "";
        const bName = b.contacts[0]?.name || "";
        cmp = aName.localeCompare(bName);
      }
      else if (effectiveCol === "monDone" || effectiveCol === "tueDone") {
        const ids = effectiveCol === "monDone" ? monMilestoneIds : tueMilestoneIds;
        const aDone = isDayDone(a, ids);
        const bDone = isDayDone(b, ids);
        if (aDone !== bDone) {
          const groupCmp = aDone ? -1 : 1;
          return effectiveDir === "asc" ? groupCmp : -groupCmp;
        }
        return a.name.localeCompare(b.name);
      }
      return effectiveDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [locations, milestones, zoneFilter, search, sortCol, sortDir]);

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  // Unselect reason modal state
  const [reasonModal, setReasonModal] = useState<{
    locationId: number;
    milestoneId: number;
    locationName: string;
  } | null>(null);

  function handleBubbleClick(locationId: number, milestoneId: number) {
    // Check if this is an unselect (currently true → going to false)
    const loc = locations.find((l) => l.id === locationId);
    const status = loc?.statuses.find((s) => s.milestoneId === milestoneId);
    const isCurrentlyDone = status?.value ?? false;

    if (isCurrentlyDone) {
      // Unselecting — require a reason
      setReasonModal({
        locationId,
        milestoneId,
        locationName: loc?.name || "",
      });
    } else {
      // Selecting — just do it
      doToggle(locationId, milestoneId);
    }
  }

  async function doToggle(locationId: number, milestoneId: number, reason?: string) {
    const res = await fetch("/api/locations/toggle-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, milestoneId, reason }),
    });

    if (!res.ok) return;

    const { status: updated } = await res.json();

    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locationId) return loc;
        return {
          ...loc,
          statuses: loc.statuses.map((s) =>
            s.milestoneId === milestoneId
              ? {
                  ...s,
                  value: updated.value,
                  updatedAt: updated.updatedAt,
                  updatedByUser: updated.updatedByUser,
                }
              : s
          ),
        };
      })
    );
  }

  // --- Local-only edit handlers (no API calls until Apply) ---

  function pushUndo() {
    setUndoHistory((prev) => [...prev, structuredClone(locations)]);
  }

  function handleEditField(locationId: number, field: string, value: string, index?: number) {
    pushUndo();
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locationId) return loc;
        const updated = { ...loc };
        if (field === "name") updated.name = value;
        else if (field === "address") updated.address = value;
        else if (field === "city") updated.city = value;
        else if (field === "pollId") updated.pollId = value || null;
        else if (field === "smsPhone") updated.smsPhone = value || null;
        else if (field === "contactName") {
          if (!value) {
            // Delete the contact
            updated.contacts = [];
          } else {
            updated.contacts = updated.contacts.map((c, ci) =>
              ci === 0 ? { ...c, name: value } : c
            );
          }
        } else if (field === "contactPhone") {
          updated.contacts = updated.contacts.map((c, ci) => {
            if (ci !== 0) return c;
            const phones = [...(c.phones as { label: string; number: string }[])];
            const idx = index ?? 0;
            if (!value) {
              phones.splice(idx, 1);
            } else if (phones[idx]) {
              phones[idx] = { ...phones[idx], number: value };
            }
            return { ...c, phones };
          });
        } else if (field === "contactPhoneLabel") {
          updated.contacts = updated.contacts.map((c, ci) => {
            if (ci !== 0) return c;
            const phones = [...(c.phones as { label: string; number: string }[])];
            const idx = index ?? 0;
            if (phones[idx]) {
              phones[idx] = { ...phones[idx], label: value || "Phone" };
            }
            return { ...c, phones };
          });
        } else if (field === "precinctLabel") {
          const idx = index ?? 0;
          if (!value) {
            updated.precincts = updated.precincts.filter((_, i) => i !== idx);
          } else {
            updated.precincts = updated.precincts.map((p, i) =>
              i === idx ? { ...p, label: value } : p
            );
          }
        }
        return updated;
      })
    );
  }

  function handleAddItem(locationId: number, field: string) {
    pushUndo();
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locationId) return loc;
        const updated = { ...loc };
        if (field === "contactPhone") {
          updated.contacts = updated.contacts.map((c, ci) => {
            if (ci !== 0) return c;
            const phones = [...(c.phones as { label: string; number: string }[])];
            phones.push({ label: "Phone", number: "" });
            return { ...c, phones };
          });
        } else if (field === "precinct") {
          updated.precincts = [...updated.precincts, { label: "NEW" } as Location["precincts"][0]];
        } else if (field === "contact") {
          updated.contacts = [
            ...updated.contacts,
            { id: -Date.now(), name: "New Contact", title: "", phones: [{ label: "Phone", number: "" }] } as Location["contacts"][0],
          ];
        }
        return updated;
      })
    );
  }

  function handleAddRow() {
    pushUndo();
    const tempId = -Date.now();
    const defaultZone = locations[0]?.zone || { id: 1, number: 1, name: "Zone 1" };
    const newLoc: Location = {
      id: tempId,
      pollId: null,
      smsPhone: null,
      name: "New Location",
      address: "",
      city: "",
      zoneId: defaultZone.id,
      zone: defaultZone,
      statuses: milestones.map((m) => ({
        id: -Math.random(),
        locationId: tempId,
        milestoneId: m.id,
        value: false,
        updatedBy: null,
        updatedAt: new Date().toISOString(),
        updatedByUser: null,
      })) as Location["statuses"],
      precincts: [{ label: "NEW" } as Location["precincts"][0]],
      contacts: [{ id: -Date.now(), name: "Contact", title: "", phones: [{ label: "Phone", number: "" }] } as Location["contacts"][0]],
    };
    setLocations((prev) => [...prev, newLoc]);
    setNewLocationIds((prev) => new Set(prev).add(tempId));
  }

  function handleDeleteRow(locationId: number) {
    pushUndo();
    setLocations((prev) => prev.filter((loc) => loc.id !== locationId));
    if (!newLocationIds.has(locationId)) {
      setDeletedLocationIds((prev) => new Set(prev).add(locationId));
    }
  }

  function handleUndo() {
    if (undoHistory.length === 0) return;
    const previous = undoHistory[undoHistory.length - 1];
    setUndoHistory((prev) => prev.slice(0, -1));
    setLocations(previous);
  }

  async function handleApply() {
    // Send all changes to the API
    const snapshotMap = new Map(snapshot.map((l) => [l.id, l]));
    const promises: Promise<unknown>[] = [];

    // 1. Delete removed rows
    for (const id of deletedLocationIds) {
      promises.push(fetch(`/api/locations/${id}`, { method: "DELETE" }));
    }

    // 2. Create new rows
    for (const loc of locations) {
      if (loc.id < 0) {
        promises.push(
          fetch("/api/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }).then(async (res) => {
            if (!res.ok) return;
            const { location: created } = await res.json();
            // Now patch all the fields that differ from defaults
            const patches: Promise<unknown>[] = [];
            if (loc.name !== "New Location") {
              patches.push(fetch(`/api/locations/${created.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ field: "name", value: loc.name }),
              }));
            }
            if (loc.address) {
              patches.push(fetch(`/api/locations/${created.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ field: "address", value: loc.address }),
              }));
            }
            if (loc.city) {
              patches.push(fetch(`/api/locations/${created.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ field: "city", value: loc.city }),
              }));
            }
            if (loc.pollId) {
              patches.push(fetch(`/api/locations/${created.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ field: "pollId", value: loc.pollId }),
              }));
            }
            await Promise.all(patches);
          })
        );
      }
    }

    // 3. Patch modified existing rows
    for (const loc of locations) {
      if (loc.id < 0) continue;
      const orig = snapshotMap.get(loc.id);
      if (!orig) continue;

      const fields: { field: string; value: string; index?: number }[] = [];
      if (loc.name !== orig.name) fields.push({ field: "name", value: loc.name });
      if (loc.address !== orig.address) fields.push({ field: "address", value: loc.address });
      if (loc.city !== orig.city) fields.push({ field: "city", value: loc.city });
      if ((loc.pollId || "") !== (orig.pollId || "")) fields.push({ field: "pollId", value: loc.pollId || "" });
      if ((loc.smsPhone || "") !== (orig.smsPhone || "")) fields.push({ field: "smsPhone", value: loc.smsPhone || "" });

      // Contact changes
      const origContact = orig.contacts[0];
      const curContact = loc.contacts[0];
      if (!curContact && origContact) {
        fields.push({ field: "contactName", value: "" });
      } else if (curContact && origContact) {
        if (curContact.name !== origContact.name) fields.push({ field: "contactName", value: curContact.name });
        const curPhones = curContact.phones as { label: string; number: string }[];
        const origPhones = origContact.phones as { label: string; number: string }[];
        // Handle phone changes
        for (let i = 0; i < Math.max(curPhones.length, origPhones.length); i++) {
          if (i >= curPhones.length) {
            // Phone was deleted
            fields.push({ field: "contactPhone", value: "", index: curPhones.length });
          } else if (i >= origPhones.length) {
            // Phone was added — first add, then set values
            fields.push({ field: "contactPhone", value: curPhones[i].number, index: i });
          } else {
            if (curPhones[i].number !== origPhones[i].number)
              fields.push({ field: "contactPhone", value: curPhones[i].number, index: i });
            if (curPhones[i].label !== origPhones[i].label)
              fields.push({ field: "contactPhoneLabel", value: curPhones[i].label, index: i });
          }
        }
      } else if (curContact && !origContact) {
        fields.push({ field: "contactName", value: curContact.name });
      }

      // Precinct changes
      for (let i = 0; i < Math.max(loc.precincts.length, orig.precincts.length); i++) {
        if (i >= loc.precincts.length) {
          fields.push({ field: "precinctLabel", value: "", index: loc.precincts.length });
        } else if (i >= orig.precincts.length) {
          fields.push({ field: "precinctLabel", value: loc.precincts[i].label, index: i });
        } else if (loc.precincts[i].label !== orig.precincts[i].label) {
          fields.push({ field: "precinctLabel", value: loc.precincts[i].label, index: i });
        }
      }

      for (const f of fields) {
        promises.push(
          fetch(`/api/locations/${loc.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(f),
          })
        );
      }
    }

    await Promise.all(promises);
    // Refresh from server to get canonical state
    await fetchData();
    setEditMode(false);
    setUndoHistory([]);
    setSnapshot([]);
    setNewLocationIds(new Set());
    setDeletedLocationIds(new Set());
  }

  function handleDiscardEdits() {
    setLocations(snapshot);
    setEditMode(false);
    setUndoHistory([]);
    setSnapshot([]);
    setNewLocationIds(new Set());
    setDeletedLocationIds(new Set());
  }

  const canEdit =
    session.role !== "VIEWER";
  const canEditDashboard =
    session.role === "ADMIN" || session.role === "SUPERVISOR";

  const showZoneFilter = session.role !== "ZONE_CAPTAIN";

  if (loading) {
    return (
      <main className="max-w-[1600px] mx-auto p-4">
        <p className="text-muted-foreground text-sm">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className={`pt-0 pb-0 space-y-0 h-screen overflow-hidden ${nightMode ? "bg-[#141414]" : ""}`}>
      {/* Admin toolbar — top of page, outside the green header */}
      {session.role === "ADMIN" && (
        <AuditCacheBar>
          {canEditDashboard && !editMode && (
            <button
              onClick={() => {
                setSnapshot(structuredClone(locations));
                setUndoHistory([]);
                setNewLocationIds(new Set());
                setDeletedLocationIds(new Set());
                setEditMode(true);
              }}
              className="h-6 px-2 rounded border border-yellow-300 bg-yellow-500/40 hover:bg-yellow-500/60 text-xs font-bold flex items-center"
            >
              Edit Dashboard
            </button>
          )}
          {editMode && (
            <>
              <button
                onClick={handleUndo}
                disabled={undoHistory.length === 0}
                className="h-6 px-2 rounded border border-orange-300 bg-orange-500/40 hover:bg-orange-500/60 text-xs font-bold flex items-center disabled:opacity-40 disabled:cursor-not-allowed"
                title={undoHistory.length > 0 ? `Undo (${undoHistory.length})` : "Nothing to undo"}
              >
                ↩ Undo{undoHistory.length > 0 ? ` (${undoHistory.length})` : ""}
              </button>
              <button
                onClick={handleDiscardEdits}
                className="h-6 px-2 rounded border border-red-300 bg-red-500/40 hover:bg-red-500/60 text-xs font-bold flex items-center"
              >
                ✕ Discard
              </button>
              <button
                onClick={handleApply}
                className="h-6 px-2 rounded border border-green-300 bg-green-500/40 hover:bg-green-500/60 text-xs font-bold flex items-center"
              >
                ✓ Apply
              </button>
            </>
          )}
          <a
            href="/admin/pins"
            className="h-6 px-2 rounded border border-purple-300 bg-purple-500/40 text-xs font-bold hover:bg-purple-500/60 flex items-center"
          >
            Account Management
          </a>
          <a
            href="/admin/cells"
            className="h-6 px-2 rounded border border-pink-300 bg-pink-500/40 text-xs font-bold hover:bg-pink-500/60 flex items-center"
          >
            Cell Management
          </a>
          <a
            href="/admin/import"
            className="h-6 px-2 rounded border border-teal-300 bg-teal-500/40 text-xs font-bold hover:bg-teal-500/60 flex items-center"
          >
            Import Data
          </a>
          <SaveAuditButton />
          <RestoreButton onRestored={fetchData} />
          <ClearElectionButton onReset={() => {
            setLocations((prev) =>
              prev.map((loc) => ({
                ...loc,
                statuses: loc.statuses.map((s) => ({ ...s, value: false })),
              }))
            );
          }} />
          <DeleteLocationsButton onDeleted={fetchData} />
        </AuditCacheBar>
      )}
      <div className="relative bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-700 text-white shadow-[0_4px_12px_rgba(0,0,0,0.25),inset_0_3px_1px_rgba(255,255,255,0.35),inset_0_-3px_1px_rgba(0,0,0,0.25)] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-0 flex flex-col items-center pointer-events-none z-10">
        <span className="text-6xl uppercase tracking-normal mt-2 pointer-events-auto" style={{ fontFamily: "'Cinzel', serif", fontWeight: 400 }}>Green Bubbles</span>
        <div className="flex-1 flex items-center -mt-2">
          <span className="flex items-center gap-3 pointer-events-auto"><LogoBubble delay={0} /><LogoBubble delay={0} /><LogoBubble delay={0} /><LogoBubble delay={0} /><LogoBubble delay={0} /></span>
        </div>
      </div>
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-2">
        <img src="/boe-logo.png" alt="Cuyahoga County Board of Elections" className="h-12 brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
        <div className="flex flex-col items-end gap-1">
          <div className="text-sm font-bold flex items-center gap-2">
            {session.displayName} <span className="text-yellow-200">{session.role.replace(/_/g, " ")}{session.zoneId ? ` · Zone ${session.zoneId}` : ""}</span>
            <span className={`inline-block w-2 h-2 rounded-full ${liveConnected ? "bg-green-300 animate-pulse" : "bg-red-400"}`} title={liveConnected ? "Live — updates in real-time" : "Reconnecting..."} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNightMode(!nightMode)}
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm"
              title={nightMode ? "Day mode" : "Night mode"}
            >
              {nightMode ? "☀" : "☾"}
            </button>
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center px-4 py-2">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-56 rounded-md border border-white/50 bg-white/30 px-3 text-sm font-bold text-white placeholder:text-white/70 placeholder:font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          />
          {showZoneFilter && (
            <select
              value={zoneFilter}
              onChange={(e) =>
                setZoneFilter(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              className="h-8 rounded-md border border-white/50 bg-white/30 px-3 text-sm font-bold text-white [&_option]:text-black [&_option]:bg-white"
            >
              <option value="all">All Zones</option>
              {zones.map((z) => (
                <option key={z.number} value={z.number}>
                  {z.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      </div>

      {/* Board */}
      <BubbleBoard
        locations={filtered}
        milestones={milestones}
        canEdit={canEdit}
        userRole={session.role}
        userZoneId={session.zoneId}
        onToggle={handleBubbleClick}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        editMode={editMode}
        onEditField={handleEditField}
        onAddItem={handleAddItem}
        onAddRow={handleAddRow}
        onDeleteRow={handleDeleteRow}
        nightMode={nightMode}
      />
      {/* Unselect reason modal */}
      {reasonModal && (
        <ReasonModal
          locationName={reasonModal.locationName}
          onConfirm={(reason) => {
            doToggle(reasonModal.locationId, reasonModal.milestoneId, reason);
            setReasonModal(null);
          }}
          onCancel={() => setReasonModal(null)}
        />
      )}
    </main>
  );
}

function ReasonModal({
  locationName,
  onConfirm,
  onCancel,
}: {
  locationName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg border shadow-lg w-full max-w-md p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Unmark Status</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You are unmarking a status for <strong>{locationName}</strong>.
            Please provide a reason.
          </p>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this being unmarked?"
          autoFocus
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="h-9 px-4 rounded-md bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
          >
            Unmark
          </button>
        </div>
      </div>
    </div>
  );
}
