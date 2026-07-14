import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ComposeForm } from "@/components/compose-form";

export default async function ComposePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Compose</h1>
        <p className="mt-1 text-sm text-stone-600">Upload media, tulis caption, lalu publish sekarang atau jadwalkan.</p>
      </div>
      <ComposeForm />
    </div>
  );
}
