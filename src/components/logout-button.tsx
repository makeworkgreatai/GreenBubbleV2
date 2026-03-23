"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="h-9 px-3 rounded-md border border-white/60 bg-black/20 text-sm font-bold hover:bg-black/30 text-white"
    >
      Logout
    </button>
  );
}
