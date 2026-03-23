"use client";

import { useEffect, useState } from "react";

interface AuditEntry {
  id: number;
  locationId: number | null;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
  user: { displayName: string } | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function fetchLogs(p = 1) {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (fieldFilter) params.set("field", fieldFilter);
    if (userFilter) params.set("user", userFilter);
    if (locationFilter) params.set("locationId", locationFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    params.set("page", String(p));

    const res = await fetch(`/api/admin/audit/search?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    }
    setLoading(false);
  }

  useEffect(() => { fetchLogs(); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchLogs(1);
  }

  async function handleDownloadFiltered() {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (fieldFilter) params.set("field", fieldFilter);
    if (userFilter) params.set("user", userFilter);
    if (locationFilter) params.set("locationId", locationFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    // Fetch ALL matching (not paginated) by getting all pages
    let allLogs: AuditEntry[] = [];
    let p = 1;
    let totalPages = 1;
    do {
      params.set("page", String(p));
      const res = await fetch(`/api/admin/audit/search?${params}`);
      if (!res.ok) break;
      const data = await res.json();
      allLogs = [...allLogs, ...data.logs];
      totalPages = data.pages;
      p++;
    } while (p <= totalPages);

    // Build CSV
    const headers = ["ID", "Date", "User", "Location ID", "Field", "Old Value", "New Value", "Reason"];
    const csvEscape = (v: string) =>
      v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v;
    const rows = allLogs.map((l) => [
      String(l.id),
      new Date(l.createdAt).toISOString(),
      l.user?.displayName || "System",
      l.locationId != null ? String(l.locationId) : "",
      l.field,
      l.oldValue || "",
      l.newValue || "",
      l.reason || "",
    ].map(csvEscape).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function fieldLabel(f: string): string {
    if (f.startsWith("milestone_")) return "Status Toggle";
    if (f.startsWith("edit_")) return "Edit: " + f.replace("edit_", "");
    if (f === "board_reset") return "Board Reset";
    if (f === "csv_restore") return "CSV Restore";
    if (f === "snapshot_restore") return "Snapshot Restore";
    if (f.startsWith("add_")) return "Add: " + f.replace("add_", "");
    if (f.startsWith("delete_")) return "Delete: " + f.replace("delete_", "");
    return f;
  }

  return (
    <main className="max-w-[1400px] mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Audit Log</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString()} total entries</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadFiltered}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
          >
            Download Filtered CSV
          </button>
          <a
            href="/"
            className="px-4 py-2 rounded-md border text-sm font-bold hover:bg-gray-100"
          >
            Back to Dashboard
          </a>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="grid grid-cols-6 gap-3 mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="col-span-2 h-9 rounded-md border px-3 text-sm"
        />
        <input
          type="text"
          placeholder="Field type..."
          value={fieldFilter}
          onChange={(e) => setFieldFilter(e.target.value)}
          className="h-9 rounded-md border px-3 text-sm"
        />
        <input
          type="text"
          placeholder="User..."
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="h-9 rounded-md border px-3 text-sm"
        />
        <input
          type="text"
          placeholder="Location ID..."
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="h-9 rounded-md border px-3 text-sm"
        />
        <button type="submit" className="h-9 rounded-md bg-black text-white text-sm font-bold hover:bg-gray-800">
          Search
        </button>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="col-span-2 h-9 rounded-md border px-3 text-sm"
          placeholder="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="col-span-2 h-9 rounded-md border px-3 text-sm"
          placeholder="To date"
        />
        <button
          type="button"
          onClick={() => { setSearch(""); setFieldFilter(""); setUserFilter(""); setLocationFilter(""); setDateFrom(""); setDateTo(""); }}
          className="col-span-2 h-9 rounded-md border text-sm font-bold hover:bg-gray-100"
        >
          Clear Filters
        </button>
      </form>

      {/* Table */}
      <div className="border rounded-lg overflow-auto max-h-[calc(100vh-280px)]">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr className="text-left">
              <th className="px-3 py-2 font-bold w-40">Date</th>
              <th className="px-3 py-2 font-bold">User</th>
              <th className="px-3 py-2 font-bold w-16">Loc ID</th>
              <th className="px-3 py-2 font-bold">Action</th>
              <th className="px-3 py-2 font-bold">Old Value</th>
              <th className="px-3 py-2 font-bold">New Value</th>
              <th className="px-3 py-2 font-bold">Reason</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No entries found</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" })}
                  </td>
                  <td className="px-3 py-2 font-medium">{log.user?.displayName || "System"}</td>
                  <td className="px-3 py-2 text-gray-600">{log.locationId || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      log.field.startsWith("delete") ? "bg-red-100 text-red-700" :
                      log.field.startsWith("add") ? "bg-green-100 text-green-700" :
                      log.field.startsWith("edit") ? "bg-blue-100 text-blue-700" :
                      log.field.includes("reset") || log.field.includes("restore") ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {fieldLabel(log.field)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={log.oldValue || ""}>
                    {log.oldValue || "—"}
                  </td>
                  <td className="px-3 py-2 max-w-[200px] truncate" title={log.newValue || ""}>
                    {log.newValue || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={log.reason || ""}>
                    {log.reason || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => fetchLogs(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded-md border text-sm font-bold hover:bg-gray-100 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm">Page {page} of {pages}</span>
          <button
            onClick={() => fetchLogs(page + 1)}
            disabled={page >= pages}
            className="px-3 py-1 rounded-md border text-sm font-bold hover:bg-gray-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
