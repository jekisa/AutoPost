import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { IgAccount } from "@/models/IgAccount";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  await IgAccount.findOneAndUpdate({}, { lastCommentsSeenAt: new Date() }, { sort: { updatedAt: -1 } });
  return NextResponse.json({ ok: true });
}
