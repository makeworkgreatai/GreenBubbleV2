"use client";

import { MobileAdminNav } from "@/components/mobile-admin-nav";

// Per-page accent themes (match the admin nav colors) so each page has a
// distinct, recognizable identity — you always know which page you're on.
const THEMES: Record<string, { grad: string; chip: string }> = {
  pins: { grad: "from-purple-500 to-purple-700", chip: "bg-purple-100 text-purple-700" },
  cells: { grad: "from-pink-500 to-pink-700", chip: "bg-pink-100 text-pink-700" },
  import: { grad: "from-teal-500 to-teal-700", chip: "bg-teal-100 text-teal-700" },
  audit: { grad: "from-cyan-500 to-cyan-700", chip: "bg-cyan-100 text-cyan-700" },
  elections: { grad: "from-indigo-500 to-indigo-700", chip: "bg-indigo-100 text-indigo-700" },
  logins: { grad: "from-orange-500 to-orange-700", chip: "bg-orange-100 text-orange-700" },
};

export function adminChip(theme: string) {
  return THEMES[theme]?.chip ?? "bg-gray-100 text-gray-700";
}

export function AdminHeader({
  theme,
  icon,
  title,
  subtitle,
  maxW = "max-w-[1200px]",
  children,
}: {
  theme: keyof typeof THEMES | string;
  icon: string;
  title: string;
  subtitle?: string;
  maxW?: string;
  children?: React.ReactNode;
}) {
  const t = THEMES[theme] ?? { grad: "from-gray-600 to-gray-800", chip: "bg-gray-100 text-gray-700" };
  return (
    <>
      <MobileAdminNav />
      <div className={`bg-gradient-to-r ${t.grad} text-white shadow-md`}>
        <div className={`${maxW} mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl md:text-4xl leading-none drop-shadow-sm" aria-hidden>{icon}</span>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-black leading-tight">{title}</h1>
              {subtitle && <p className="text-xs md:text-sm text-white/80 leading-tight">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {children}
            <a
              href="/"
              className="rounded-md bg-white/20 hover:bg-white/30 px-3 py-2 text-xs md:text-sm font-bold whitespace-nowrap transition-colors"
            >
              ← Dashboard
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
