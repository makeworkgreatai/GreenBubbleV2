"use client";

import { useState, useRef } from "react";

interface GeneratedPin {
  pin: string;
  displayName: string;
}

const ROLES = [
  { value: "ZONE_CAPTAIN", label: "Zone Captain" },
  { value: "PHONE_OPERATOR", label: "Phone Operator" },
  { value: "VIEWER", label: "Viewer" },
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
  {
    value: "named",
    label: "Individual",
    desc: "Each person gets their own PIN with their name already set",
  },
  {
    value: "open",
    label: "Open",
    desc: "Each person gets their own PIN and types their name when they log in",
  },
  {
    value: "shared",
    label: "Shared",
    desc: "Everyone on this role uses the same PIN and types their name when they log in",
  },
];

export default function PinManagementPage() {
  const [role, setRole] = useState("ZONE_CAPTAIN");
  const [count, setCount] = useState(5);
  const [zoneId, setZoneId] = useState(1);
  const [pinMode, setPinMode] = useState("open");
  const [expiresAt, setExpiresAt] = useState("");
  const [pins, setPins] = useState<GeneratedPin[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expiring, setExpiring] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/pins/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          count: pinMode === "shared" ? 1 : count,
          zoneId: role === "ZONE_CAPTAIN" ? zoneId : undefined,
          pinMode,
          expiresAt: expiresAt || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setPins(data.pins);
    } catch {
      setError("Failed to generate PINs");
    } finally {
      setLoading(false);
    }
  }

  async function handleExpireAll() {
    if (!confirm("This will expire ALL non-admin PINs. Are you sure?")) return;
    setExpiring(true);

    try {
      const res = await fetch("/api/admin/pins/expire-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      alert(`${data.expired} PINs expired.`);
    } catch {
      setError("Failed to expire PINs");
    } finally {
      setExpiring(false);
    }
  }

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
      <head><title>PIN Sheet — GreenBubble</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .header { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
        .sub { color: #666; font-size: 14px; }
      </style></head>
      <body>
        <div class="header">GreenBubble — PIN Sheet</div>
        <div class="sub">Role: ${role.replace("_", " ")} | Mode: ${pinMode} | Generated: ${new Date().toLocaleDateString()}</div>
        ${content.innerHTML}
        <script>window.print();window.close();</script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">PIN Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate PINs for election day staff
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">PIN Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {PIN_MODES.map((m) => (
              <label
                key={m.value}
                className={`flex flex-col gap-1 rounded-md border p-3 cursor-pointer transition-colors ${
                  pinMode === m.value
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pinMode"
                    value={m.value}
                    checked={pinMode === m.value}
                    onChange={(e) => setPinMode(e.target.value)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-sm font-medium">{m.label}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5.5">
                  {m.desc}
                </p>
              </label>
            ))}
          </div>
        </div>

        <div className={pinMode === "shared" ? "" : "grid grid-cols-2 gap-4"}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {pinMode !== "shared" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Count</label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        {role === "ZONE_CAPTAIN" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Zone</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ZONES.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Expiry Date <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate PINs"}
          </button>

          <button
            type="button"
            onClick={handleExpireAll}
            disabled={expiring}
            className="h-10 px-4 rounded-md border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
          >
            {expiring ? "Expiring..." : "Expire All PINs"}
          </button>
        </div>
      </form>

      {pins.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Generated {pins.length} {pins.length === 1 ? "PIN" : "PINs"}
            </h2>
            <button
              onClick={handlePrint}
              className="h-9 px-3 rounded-md border text-sm font-medium hover:bg-accent"
            >
              Print Sheet
            </button>
          </div>

          <div ref={printRef}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Name</th>
                  <th className="text-left py-2 px-3 font-medium">PIN</th>
                  <th className="text-left py-2 px-3 font-medium">Role</th>
                  {role === "ZONE_CAPTAIN" && (
                    <th className="text-left py-2 px-3 font-medium">Zone</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pins.map((p, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3 text-muted-foreground italic">
                      (write name here)
                    </td>
                    <td className="py-2 px-3 font-mono font-bold">{p.pin}</td>
                    <td className="py-2 px-3">{role.replace("_", " ")}</td>
                    {role === "ZONE_CAPTAIN" && (
                      <td className="py-2 px-3">Zone {zoneId}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
