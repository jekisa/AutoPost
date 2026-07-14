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
        <h1 className="text-3xl font-semibold">Instagram Connection</h1>
        <p className="mt-1 text-sm text-stone-600">Simpan long-lived token Meta dan verifikasi koneksi akun.</p>
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
