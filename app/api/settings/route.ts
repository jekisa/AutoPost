import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { getAccountInfo } from "@/lib/meta/instagram";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  igUserId: z.string().min(5),
  pageId: z.string().min(5),
  accessToken: z.string().min(20),
  tokenExpiresAt: z.string().optional()
});

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
    const accountInfo = await getAccountInfo(igUserId, accessToken);
    const account = await prisma.igAccount.upsert({
      where: { igUserId },
      update: {
        pageId,
        username: accountInfo.username ?? accountInfo.name,
        accessToken: encryptSecret(accessToken),
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null
      },
      create: {
        igUserId,
        pageId,
        username: accountInfo.username ?? accountInfo.name,
        accessToken: encryptSecret(accessToken),
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null
      }
    });

    await prisma.publishLog.create({
      data: {
        action: "test_connection",
        request: { igUserId, fields: "id,username,name" },
        response: accountInfo,
        status: "success"
      }
    });

    return NextResponse.json({
      igUserId: account.igUserId,
      username: account.username,
      tokenExpiresAt: account.tokenExpiresAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal test connection.";
    await prisma.publishLog.create({
      data: {
        action: "test_connection",
        request: { igUserId, fields: "id,username,name" },
        response: { error: message },
        status: "failed"
      }
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
