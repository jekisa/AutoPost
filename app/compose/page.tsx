import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ComposeCalendar } from "@/components/compose-calendar";

export default async function ComposePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <Suspense fallback={<div className="shimmer h-[70vh] rounded-[2rem] bg-slate-200 dark:bg-slate-800" />}>
      <ComposeCalendar />
    </Suspense>
  );
}
