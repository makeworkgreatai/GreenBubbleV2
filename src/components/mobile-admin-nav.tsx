"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", color: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300" },
  { href: "/changelog", label: "Election Overview", color: "bg-gray-500/20 border-gray-400/30 text-gray-300" },
  { href: "/admin/pins", label: "Account Management", color: "bg-purple-500/20 border-purple-400/30 text-purple-300" },
  { href: "/admin/cells", label: "Cell Management", color: "bg-pink-500/20 border-pink-400/30 text-pink-300" },
  { href: "/admin/import", label: "Import Data", color: "bg-teal-500/20 border-teal-400/30 text-teal-300" },
  { href: "/admin/audit", label: "Audit Log", color: "bg-cyan-500/20 border-cyan-400/30 text-cyan-300" },
  { href: "/admin/logins", label: "Login Activity", color: "bg-orange-500/20 border-orange-400/30 text-orange-300" },
];

export function MobileAdminNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-gray-900 text-gray-300 text-xs font-medium">
        <span className="text-gray-400">Admin</span>
        <button onClick={() => setOpen(!open)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700 text-lg">
          {open ? "✕" : "☰"}
        </button>
      </div>
      {open && (
        <div className="bg-gray-900 border-t border-gray-700 px-3 py-2 space-y-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg border text-sm font-bold ${item.color} ${pathname === item.href ? "ring-2 ring-white/30" : ""}`}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
