import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardOverview } from "@/components/dashboard-overview";

export default async function DashboardOverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <DashboardOverview />;
}
