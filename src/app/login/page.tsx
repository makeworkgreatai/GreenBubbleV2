"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Green header band */}
      <div className="relative bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-700 text-white shadow-[0_4px_12px_rgba(0,0,0,0.25),inset_0_3px_1px_rgba(255,255,255,0.35),inset_0_-3px_1px_rgba(0,0,0,0.25)] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] py-8">
        <div className="flex flex-col items-center">
          <img src="/boe-logo.png" alt="Cuyahoga County Board of Elections" className="h-14 brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] mb-3" />
          <span className="text-3xl sm:text-5xl uppercase tracking-normal text-center" style={{ fontFamily: "'Cinzel', serif", fontWeight: 400 }}>Green Bubbles</span>
        </div>
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-start md:items-center justify-center p-4 pt-6 md:-mt-8">
        <div className="w-full max-w-sm md:max-w-md bg-white rounded-xl shadow-2xl border p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-black">Sign In</h2>
            <p className="text-sm text-gray-500 mt-1">Enter your username and PIN</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-bold">
                Username
              </label>
              <input
                id="name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your username"
                required
                autoFocus
                className="flex h-11 w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium focus:border-emerald-500 focus:bg-white focus-visible:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="pin" className="text-sm font-bold">
                PIN
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="4-digit PIN"
                required
                className="flex h-11 w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium focus:border-emerald-500 focus:bg-white focus-visible:outline-none transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full h-11 items-center justify-center rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 text-white text-sm font-black shadow-md hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-50 transition-all"
            >
              {loading ? "Logging in..." : "Enter"}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400 font-bold">OR</span></div>
          </div>

          <a href="/view" className="flex items-center justify-center w-full h-10 rounded-lg border-2 border-dashed border-gray-300 text-sm font-bold text-gray-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
            View Dashboard (Read Only)
          </a>
        </div>
      </div>
    </main>
  );
}
