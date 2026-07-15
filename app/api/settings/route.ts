import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getAccountInfo } from "@/lib/meta/instagram";
import { convertWIBInputToUTC } from "@/lib/timezone";
import { IgAccount } from "@/models/IgAccount";
import { PublishLog } from "@/models/PublishLog";

const schema = z.object({
  igUserId: z.string().min(5),
  pageId: z.string().min(5),
  accessToken: z.string().min(20),
  tokenExpiresAt: z.string().optional()
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const account = await IgAccount.findOne().sort({ updatedAt: -1 }).select("username").lean();
  return NextResponse.json({ username: account?.username ?? null });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return NextResponse.json({ error: "Input settings tidak valid." }, { status: 400 });
  }

  const { igUserId, pageId, accessToken, tokenExpiresAt } = parsed.data;

  try {
    await connectDB();
    const accountInfo = await getAccountInfo(igUserId, accessToken);
    const account = await IgAccount.findOneAndUpdate(
      { igUserId },
      {
        pageId,
        username: accountInfo.username ?? accountInfo.name,
        accessToken,
        tokenExpiresAt: tokenExpiresAt ? convertWIBInputToUTC(tokenExpiresAt) : null
      },
      { new: true, upsert: true, runValidators: true }
    );

    await PublishLog.create({
      action: "test_connection",
      request: { igUserId, fields: "id,username,name" },
      response: accountInfo,
      status: "success"
    });

    return NextResponse.json({
      igUserId: account.igUserId,
      username: account.username,
      tokenExpiresAt: account.tokenExpiresAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal test connection.";
    await connectDB();
    await PublishLog.create({
        action: "test_connection",
        request: { igUserId, fields: "id,username,name" },
        response: { error: message },
        status: "failed"
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
