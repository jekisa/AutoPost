import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { getMediaComments } from "@/lib/meta/instagram";
import { connectDB } from "@/lib/mongodb";
import { IgAccount } from "@/models/IgAccount";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mediaId = new URL(request.url).searchParams.get("mediaId");
  if (!mediaId || !/^\d{8,}$/.test(mediaId)) return NextResponse.json({ error: "Media ID tidak valid." }, { status: 400 });

  await connectDB();
  const account = await IgAccount.findOne().sort({ updatedAt: -1 });
  if (!account) return NextResponse.json({ error: "Instagram account belum dikonfigurasi." }, { status: 400 });
  try {
    return NextResponse.json({ comments: await getMediaComments(mediaId, decryptSecret(account.accessToken)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Komentar tidak dapat dimuat." }, { status: 400 });
  }
}
