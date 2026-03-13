import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <DashboardShell session={session} />;
}
