import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const account = await prisma.igAccount.findFirst({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Instagram Connection</h1>
        <p className="mt-1 text-sm text-stone-600">Simpan long-lived token Meta dan verifikasi koneksi akun.</p>
      </div>
      <SettingsForm initialValues={account} />
    </div>
  );
}
