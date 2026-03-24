"use client";

import { useState, useEffect } from "react";
import { MobileAdminNav } from "@/components/mobile-admin-nav";

interface LoginEntry {
  id: number;
  userId: number | null;
  displayName: string;
  success: boolean;
  ip: string;
  userAgent: string;
  reason: string | null;
  createdAt: string;
  user: { displayName: string; role: string } | null;
}

export default function LoginLogsPage() {
  const [logs, setLogs] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function fetchLogs(p: number) {
    setLoading(true);
    const res = await fetch(`/api/admin/logins?page=${p}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotalPages(data.pages);
      setTotal(data.total);
    }
    setLoading(false);
  }

  useEffect(() => { fetchLogs(page); }, [page]);

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York",
    });
  }

  function parseDevice(ua: string): string {
    if (!ua) return "Unknown";
    if (ua.includes("iPhone")) return "iPhone";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPad")) return "iPad";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac")) return "Mac";
    if (ua.includes("Linux")) return "Linux";
    return "Other";
  }

  return (
    <>
    <MobileAdminNav />
    <main className="max-w-[1200px] mx-auto p-4 md:p-6 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black">Login Activity</h1>
          <p className="text-sm text-gray-500">{total} total login attempts</p>
        </div>
        <a href="/" className="px-3 py-2 rounded-md border text-xs md:text-sm font-bold hover:bg-gray-100 self-start">Dashboard</a>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : logs.map((log) => (
          <div key={log.id} className={`rounded-lg border p-3 ${log.success ? "bg-white" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${log.success ? "bg-green-500" : "bg-red-500"}`} />
                <span className="font-bold text-sm">{log.displayName}</span>
              </div>
              <span className="text-xs text-gray-500">{formatTime(log.createdAt)}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 ml-4">
              {log.user && <span className="font-medium">{log.user.role.replace(/_/g, " ")}</span>}
              <span className="font-mono">{log.ip}</span>
              <span>{parseDevice(log.userAgent)}</span>
              {log.reason && <span className="text-red-600 font-medium">{log.reason}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr className="text-left">
              <th className="px-3 py-2 font-bold w-8"></th>
              <th className="px-3 py-2 font-bold">Name</th>
              <th className="px-3 py-2 font-bold">Role</th>
              <th className="px-3 py-2 font-bold">IP Address</th>
              <th className="px-3 py-2 font-bold">Device</th>
              <th className="px-3 py-2 font-bold">Reason</th>
              <th className="px-3 py-2 font-bold">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No login attempts</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className={`border-t ${log.success ? "" : "bg-red-50"}`}>
                <td className="px-3 py-2">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${log.success ? "bg-green-500" : "bg-red-500"}`} />
                </td>
                <td className="px-3 py-2 font-medium">{log.displayName}</td>
                <td className="px-3 py-2 text-gray-600">{log.user?.role.replace(/_/g, " ") || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{log.ip}</td>
                <td className="px-3 py-2 text-gray-600">{parseDevice(log.userAgent)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{log.reason || "—"}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatTime(log.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-md border text-xs font-bold hover:bg-gray-100 disabled:opacity-40">Prev</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-md border text-xs font-bold hover:bg-gray-100 disabled:opacity-40">Next</button>
        </div>
      )}
    </main>
    </>
  );
}
