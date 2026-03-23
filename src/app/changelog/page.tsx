"use client";

import { useState, useEffect } from "react";

interface LogEntry {
  id: number;
  locationId: number | null;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
  user: { displayName: string } | null;
  locationName?: string;
}

interface MilestoneOption {
  id: number;
  key: string;
  label: string;
}

interface MilestoneLocation {
  id: number;
  name: string;
  pollId: string | null;
}

interface MilestoneStat {
  id: number;
  label: string;
  done: number;
  total: number;
  pct: number;
  doneList: MilestoneLocation[];
  notDoneList: MilestoneLocation[];
}

interface ZoneStat {
  zone: number;
  name: string;
  total: number;
  allDone: number;
  pct: number;
}

interface CityStat {
  name: string;
  total: number;
  allDone: number;
  pct: number;
}

interface Stats {
  totalLocations: number;
  fullyComplete: number;
  overallPct: number;
  milestoneStats: MilestoneStat[];
  zoneStats: ZoneStat[];
  cityStats: CityStat[];
  cities: string[];
  zones: { number: number; name: string }[];
}

export default function ChangeLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [milestones, setMilestones] = useState<MilestoneOption[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function fetchLogs(p: number, f: string, q: string = "", z: string = "", c: string = "") {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (f !== "all") params.set("field", f);
    if (q.trim()) params.set("q", q.trim());
    if (z) params.set("zone", z);
    if (c) params.set("city", c);
    const res = await fetch(`/api/changelog?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotalPages(data.pages);
    }
    setLoading(false);
  }

  async function fetchStats(z: string = "", c: string = "") {
    const params = new URLSearchParams();
    if (z) params.set("zone", z);
    if (c) params.set("city", c);
    const res = await fetch(`/api/changelog/stats?${params}`);
    if (res.ok) {
      const data = await res.json();
      setStats(data);
      if (data.milestones) setMilestones(data.milestones);
    }
  }

  useEffect(() => { fetchStats(zoneFilter, cityFilter); }, [zoneFilter, cityFilter]);
  useEffect(() => { fetchLogs(page, filter, search, zoneFilter, cityFilter); }, [page, filter, search, zoneFilter, cityFilter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats(zoneFilter, cityFilter);
      fetchLogs(page, filter, search, zoneFilter, cityFilter);
    }, 30_000);
    return () => clearInterval(interval);
  }, [page, filter, search, zoneFilter, cityFilter]);

  function handleFilter(f: string) {
    setFilter(f);
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function fieldLabel(field: string): string {
    const ms = milestones.find((m) => field === `milestone_${m.id}`);
    if (ms) return ms.label;
    return field.replace(/_/g, " ");
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York",
    });
  }

  function pctColor(pct: number): string {
    if (pct >= 90) return "bg-green-500";
    if (pct >= 60) return "bg-emerald-500";
    if (pct >= 30) return "bg-yellow-500";
    return "bg-red-500";
  }

  const filterOptions = [
    { value: "all", label: "All" },
    ...milestones.map((m) => ({ value: `milestone_${m.id}`, label: m.label })),
  ];

  return (
    <main className="max-w-[1100px] mx-auto p-6 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Election Overview</h1>
          <p className="text-sm text-gray-500">Live progress and recent changes</p>
        </div>
        <a href="/" className="px-4 py-2 rounded-md border text-sm font-bold hover:bg-gray-100">Back to Dashboard</a>
      </div>

      {/* Active filter bubbles */}
      {(filter !== "all" || zoneFilter || cityFilter || search) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-gray-500 font-bold">Filtered by:</span>
          {filter !== "all" && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 border border-green-400 text-green-800 text-xs font-bold">
              {milestones.find((m) => `milestone_${m.id}` === filter)?.label || filter}
              <button onClick={() => handleFilter("all")} className="ml-1 hover:text-green-600">✕</button>
            </span>
          )}
          {zoneFilter && stats && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 border border-green-400 text-green-800 text-xs font-bold">
              {stats.zones.find((z) => z.number === Number(zoneFilter))?.name || `Zone ${zoneFilter}`}
              <button onClick={() => { setZoneFilter(""); setPage(1); }} className="ml-1 hover:text-green-600">✕</button>
            </span>
          )}
          {cityFilter && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 border border-green-400 text-green-800 text-xs font-bold">
              {cityFilter}
              <button onClick={() => { setCityFilter(""); setPage(1); }} className="ml-1 hover:text-green-600">✕</button>
            </span>
          )}
          {search && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 border border-green-400 text-green-800 text-xs font-bold">
              &ldquo;{search}&rdquo;
              <button onClick={() => handleSearch("")} className="ml-1 hover:text-green-600">✕</button>
            </span>
          )}
          <button
            onClick={() => { handleFilter("all"); setZoneFilter(""); setCityFilter(""); handleSearch(""); setPage(1); }}
            className="text-xs text-gray-500 hover:text-gray-700 font-bold underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Stats section */}
      {stats && (
        <div className="mb-6 space-y-4">
          {/* Overall completion */}
          <div className="flex items-center gap-4 p-4 rounded-lg border bg-gray-50">
            <div className="text-center min-w-[100px]">
              <div className="text-4xl font-black">{stats.overallPct}%</div>
              <div className="text-xs text-gray-500 font-bold">Complete</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-bold">All Milestones Done</span>
                <span className="text-gray-600 font-mono">{stats.fullyComplete} / {stats.totalLocations}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pctColor(stats.overallPct)} transition-all`} style={{ width: `${stats.overallPct}%` }} />
              </div>
            </div>
          </div>

          {/* Milestone progress bars */}
          <div className="grid grid-cols-1 gap-2">
            {stats.milestoneStats.map((ms) => {
              const isSelected = filter === `milestone_${ms.id}`;
              return (
                <div key={ms.id}>
                  <button
                    onClick={() => handleFilter(isSelected ? "all" : `milestone_${ms.id}`)}
                    className={`w-full px-3 py-2 rounded-lg border-2 text-left transition-colors ${
                      isSelected ? "border-green-500 bg-green-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-bold truncate">{ms.label}</div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`text-xs font-mono font-bold ${ms.pct === 100 ? "text-green-600" : "text-gray-700"}`}>{ms.done}/{ms.total}</span>
                        <span className={`text-sm font-black ${ms.pct === 100 ? "text-green-600" : "text-gray-700"}`}>{ms.pct}%</span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pctColor(ms.pct)} transition-all`} style={{ width: `${ms.pct}%` }} />
                    </div>
                  </button>
                  {isSelected && (
                    <div className="mt-1 mb-2 rounded-lg border border-green-300 bg-green-50/50 p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Not done */}
                        <div>
                          <div className="text-xs font-bold text-red-600 mb-2">Remaining ({ms.notDoneList.length})</div>
                          <div className="max-h-48 overflow-auto space-y-0.5">
                            {ms.notDoneList.map((loc) => (
                              <div key={loc.id} className="flex items-center gap-2 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                <span className="font-mono text-gray-500 w-10">{loc.pollId}</span>
                                <span className="font-medium truncate">{loc.name}</span>
                              </div>
                            ))}
                            {ms.notDoneList.length === 0 && <div className="text-xs text-gray-400 italic">All done!</div>}
                          </div>
                        </div>
                        {/* Done */}
                        <div>
                          <div className="text-xs font-bold text-green-600 mb-2">Complete ({ms.doneList.length})</div>
                          <div className="max-h-48 overflow-auto space-y-0.5">
                            {ms.doneList.map((loc) => (
                              <div key={loc.id} className="flex items-center gap-2 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                <span className="font-mono text-gray-500 w-10">{loc.pollId}</span>
                                <span className="font-medium truncate">{loc.name}</span>
                              </div>
                            ))}
                            {ms.doneList.length === 0 && <div className="text-xs text-gray-400 italic">None yet</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Zone breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {stats.zoneStats.map((z) => (
              <div
                key={z.zone}
                className={`rounded-lg border-2 p-3 cursor-pointer transition-colors ${zoneFilter === String(z.zone) ? "border-green-500 bg-green-50" : "border-gray-200 hover:bg-gray-50"}`}
                onClick={() => { setZoneFilter(zoneFilter === String(z.zone) ? "" : String(z.zone)); setPage(1); }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-bold truncate">{z.name}</span>
                  <span className="text-sm font-black shrink-0">{z.pct}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pctColor(z.pct)} transition-all`} style={{ width: `${z.pct}%` }} />
                </div>
                <div className="text-xs text-gray-500 mt-1">{z.allDone} of {z.total} fully complete</div>
              </div>
            ))}
          </div>

          {/* City breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {stats.cityStats.map((c) => (
              <div
                key={c.name}
                className={`rounded-lg border-2 p-3 cursor-pointer transition-colors ${cityFilter === c.name ? "border-green-500 bg-green-50" : "border-gray-200 hover:bg-gray-50"}`}
                onClick={() => { setCityFilter(cityFilter === c.name ? "" : c.name); setPage(1); }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-bold truncate">{c.name}</span>
                  <span className="text-sm font-black shrink-0">{c.pct}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pctColor(c.pct)} transition-all`} style={{ width: `${c.pct}%` }} />
                </div>
                <div className="text-xs text-gray-500 mt-1">{c.allDone} of {c.total} fully complete</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs and search */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleFilter(opt.value)}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
              filter === opt.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <div className="w-full md:w-auto md:ml-auto flex items-center gap-2 mt-2 md:mt-0">
          {stats && stats.zones.length > 0 && (
            <select
              value={zoneFilter}
              onChange={(e) => { setZoneFilter(e.target.value); setPage(1); }}
              className="px-2 py-1 rounded-md border text-xs font-bold"
            >
              <option value="">All Zones</option>
              {stats.zones.map((z) => (
                <option key={z.number} value={z.number}>{z.name}</option>
              ))}
            </select>
          )}
          {stats && stats.cities.length > 0 && (
            <select
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
              className="px-2 py-1 rounded-md border text-xs font-bold"
            >
              <option value="">All Cities</option>
              {stats.cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="Search location..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="px-3 py-1 rounded-md border text-sm w-48 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
      </div>

      {/* Change log */}
      <div className="border rounded-lg">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">No changes found</div>
        ) : (
          <div className="divide-y">
            {logs.filter((l) => l.field.startsWith("milestone_")).map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {log.newValue === "true" ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">GREEN</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">RED</span>
                    )}
                    <span className="font-bold text-sm">{fieldLabel(log.field)}</span>
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5">
                    {log.locationName || `Location #${log.locationId}`}
                  </div>
                  {log.reason && (
                    <div className="text-xs text-gray-500 mt-0.5 italic">{log.reason}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-gray-700">{log.user?.displayName || "SMS"}</div>
                  <div className="text-xs text-gray-500">{formatTime(log.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-md border text-xs font-bold hover:bg-gray-100 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-md border text-xs font-bold hover:bg-gray-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
