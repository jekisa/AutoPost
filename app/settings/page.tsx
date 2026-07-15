import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { SettingsForm } from "@/components/settings-form";
import { IgAccount } from "@/models/IgAccount";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  await connectDB();
  const account = await IgAccount.findOne().sort({ updatedAt: -1 }).lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Instagram Connection</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Simpan long-lived token Meta dan verifikasi koneksi akun.</p>
      </div>
      <SettingsForm
        initialValues={
          account
            ? {
                igUserId: account.igUserId,
                pageId: account.pageId,
                username: account.username,
                tokenExpiresAt: account.tokenExpiresAt
              }
            : null
        }
      />
    </div>
  );
}
