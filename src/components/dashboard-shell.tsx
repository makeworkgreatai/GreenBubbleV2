"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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

function ResetBoardButton({ onReset }: { onReset: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  async function handleConfirm() {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
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
        className="h-7 px-2 rounded-md border border-red-300/50 bg-red-500/30 text-sm font-bold hover:bg-red-500/50 flex items-center"
      >
        Reset Bubbles
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCancel}>
      <div className="bg-white text-black rounded-lg shadow-2xl p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
        {step === 1 ? (
          <>
            <h2 className="text-lg font-black text-red-600 mb-2">Are you sure?</h2>
            <p className="text-sm mb-4">This will reset ALL bubbles for ALL locations back to incomplete. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancel} className="px-4 py-2 rounded-md border text-sm font-bold hover:bg-gray-100">Cancel</button>
              <button onClick={handleConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-bold hover:bg-red-700">Yes, Reset All</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-black text-red-600 mb-2">FINAL WARNING</h2>
            <p className="text-sm mb-2">You are about to reset the <span className="font-black">ENTIRE</span> board. Every single bubble will be set to incomplete.</p>
            <p className="text-sm font-bold text-red-600 mb-4">This is irreversible. Are you absolutely sure?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancel} className="px-4 py-2 rounded-md border text-sm font-bold hover:bg-gray-100">No, Go Back</button>
              <button onClick={handleConfirm} className="px-4 py-2 rounded-md bg-red-700 text-white text-sm font-black hover:bg-red-800">RESET EVERYTHING</button>
            </div>
          </>
        )}
      </div>
    </div>
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

  const canEdit =
    session.role !== "VIEWER";

  const showZoneFilter = session.role !== "ZONE_CAPTAIN";

  if (loading) {
    return (
      <main className="max-w-[1600px] mx-auto p-4">
        <p className="text-muted-foreground text-sm">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="pt-0 pb-0 space-y-0 h-screen overflow-hidden">
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
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold">{session.displayName}</span>
          <span className="text-sm text-yellow-200 font-bold">
            {session.role.replace(/_/g, " ")}
            {session.zoneId ? ` · Zone ${session.zoneId}` : ""}
          </span>
          {(session.role === "ADMIN" || session.role === "SUPERVISOR") && (
            <a
              href="/admin/pins"
              className="h-7 px-2 rounded-md border border-white/50 bg-white/20 text-sm font-bold hover:bg-white/30 flex items-center"
            >
              Manage PINs
            </a>
          )}
          {session.role === "ADMIN" && (
            <ResetBoardButton onReset={() => {
              setLocations((prev) =>
                prev.map((loc) => ({
                  ...loc,
                  statuses: loc.statuses.map((s) => ({ ...s, value: false })),
                }))
              );
            }} />
          )}
          <LogoutButton />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-2">
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
