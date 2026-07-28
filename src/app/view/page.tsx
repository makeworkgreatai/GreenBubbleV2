"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BubbleBoard } from "@/components/bubble-board";

interface Milestone { id: number; key: string; label: string; displayOrder: number; }
interface Status { id: number; locationId: number; milestoneId: number; value: boolean; updatedBy: number | null; updatedAt: string; updatedByUser: { displayName: string } | null; }
interface Zone { id: number; number: number; name: string; }
interface Location { id: number; pollId: string | null; smsPhone: string | null; name: string; address: string; city: string; zoneId: number; zone: Zone; statuses: Status[]; precincts: { label: string }[]; contacts: { id: number; name: string; title: string; phones: { label: string; number: string }[] }[]; }

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function PublicViewPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<number | "all">("all");
  const [sortCol, setSortCol] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [lastActivity, setLastActivity] = useState<{ text: string; time: Date } | null>(null);
  const [, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/view");
    if (res.status === 403) { setAllowed(false); setLoading(false); return; }
    if (!res.ok) { router.push("/login"); return; }
    setAllowed(true);
    const data = await res.json();
    setMilestones(data.milestones);
    setLocations(data.locations);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 15s
  useEffect(() => {
    if (!allowed) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [allowed, fetchData]);

  // Tick for timeAgo
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10000);
    return () => clearInterval(t);
  }, []);

  // SSE for live updates
  useEffect(() => {
    if (!allowed) return;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/events");
      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === "status_update") {
            setLocations((prev) => {
              const loc = prev.find((l) => l.id === event.locationId);
              if (loc) {
                const ms = milestones.find((m) => m.id === event.milestoneId);
                const who = event.updatedByUser?.displayName || "SMS";
                const status = event.value ? "GREEN" : "RED";
                setLastActivity({ text: `${loc.name} — ${ms?.label || "?"} → ${status} by ${who}`, time: new Date() });
              }
              return prev.map((l) => {
                if (l.id !== event.locationId) return l;
                return { ...l, statuses: l.statuses.map((s) => s.milestoneId === event.milestoneId ? { ...s, value: event.value, updatedAt: event.updatedAt, updatedByUser: event.updatedByUser } : s) };
              });
            });
          } else if (event.type === "board_reset" || event.type === "location_change") {
            fetchData();
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => { es?.close(); reconnectTimer = setTimeout(connect, 3000); };
    }

    connect();
    return () => { es?.close(); clearTimeout(reconnectTimer); };
  }, [allowed, fetchData, milestones]);

  const zones = useMemo(() => {
    const zoneMap = new Map<number, Zone>();
    locations.forEach((loc) => zoneMap.set(loc.zone.number, loc.zone));
    return Array.from(zoneMap.values()).sort((a, b) => a.number - b.number);
  }, [locations]);

  const filtered = useMemo(() => {
    let result = locations;
    if (zoneFilter !== "all") result = result.filter((loc) => loc.zone.number === zoneFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((loc) => loc.name.toLowerCase().includes(q) || loc.address.toLowerCase().includes(q) || loc.city.toLowerCase().includes(q));
    }
    const effectiveCol = search.trim() ? "name" : sortCol;
    const effectiveDir = search.trim() ? "asc" as const : sortDir;
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (effectiveCol === "name") cmp = a.name.localeCompare(b.name);
      else if (effectiveCol === "city") cmp = a.city.localeCompare(b.city);
      else if (effectiveCol === "zone") cmp = a.zone.number - b.zone.number;
      else if (effectiveCol === "pollId") cmp = (a.pollId || "").localeCompare(b.pollId || "");
      else if (effectiveCol.startsWith("ms:")) {
        const mid = Number(effectiveCol.slice(3));
        const aVal = a.statuses.some((s) => s.milestoneId === mid && s.value);
        const bVal = b.statuses.some((s) => s.milestoneId === mid && s.value);
        if (aVal !== bVal) {
          const groupCmp = aVal ? -1 : 1;
          return effectiveDir === "asc" ? groupCmp : -groupCmp;
        }
        return a.name.localeCompare(b.name);
      }
      return effectiveDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [locations, zoneFilter, search, sortCol, sortDir]);

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  if (allowed === false) {
    return (
      <main className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-black mb-2">Access Denied</h1>
          <p className="text-gray-500">Open access is not enabled. Contact an administrator.</p>
          <a href="/login" className="mt-4 inline-block px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-bold">Go to Login</a>
        </div>
      </main>
    );
  }

  if (loading) {
    return <main className="flex items-center justify-center h-screen"><p className="text-gray-500">Loading...</p></main>;
  }

  return (
    <main className="pt-0 pb-0 space-y-0 h-screen overflow-hidden flex flex-col">
      {/* Activity bar */}
      <a href="/changelog" className="flex items-center justify-between px-4 py-1 bg-gray-800 text-gray-300 text-xs font-medium hover:bg-gray-700 cursor-pointer">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${lastActivity ? "bg-yellow-400 animate-pulse" : "bg-gray-500"}`} />
          <span>{lastActivity ? lastActivity.text : "Election Overview"}</span>
        </div>
        <span className="text-gray-500">{lastActivity ? `${timeAgo(lastActivity.time)} · ` : ""}View all</span>
      </a>

      {/* Green header */}
      <div className="relative bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-700 text-white shadow-[0_4px_12px_rgba(0,0,0,0.25),inset_0_3px_1px_rgba(255,255,255,0.35),inset_0_-3px_1px_rgba(0,0,0,0.25)] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 flex flex-col items-center pointer-events-none z-10">
          <span className="text-6xl uppercase tracking-normal mt-2 pointer-events-auto" style={{ fontFamily: "'Cinzel', serif", fontWeight: 400 }}>Green Bubbles</span>
        </div>
        <div className="relative flex items-center justify-between px-4 py-2">
          <img src="/boe-logo.png" alt="BOE" className="h-12 brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
          <div className="text-sm font-bold">Read Only</div>
        </div>

        <div className="flex items-center px-4 py-2">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-56 rounded-md border border-white/60 bg-black/20 px-3 text-sm font-bold text-white placeholder:text-white/80 placeholder:font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            />
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="h-8 rounded-md border border-white/60 bg-black/20 px-3 text-sm font-bold text-white [&_option]:text-black [&_option]:bg-white"
            >
              <option value="all">All Zones</option>
              {zones.map((z) => <option key={z.number} value={z.number}>{z.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <BubbleBoard
        locations={filtered}
        milestones={milestones}
        canEdit={false}
        userRole="VIEWER"
        userZoneId={null}
        onToggle={() => {}}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        editMode={false}
        onEditField={() => {}}
        onAddItem={() => {}}
        onAddRow={() => {}}
        onDeleteRow={() => {}}
        publicView={true}
      />
    </main>
  );
}
