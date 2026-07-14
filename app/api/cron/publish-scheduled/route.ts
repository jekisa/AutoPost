import { NextResponse } from "next/server";
import { getErrorMessage, publishPostWithRetry } from "@/lib/posts/publisher";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || headerSecret === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const duePosts = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: new Date() }
    },
    orderBy: { scheduledAt: "asc" },
    take: 10
  });

  const results = [];

  for (const post of duePosts) {
    const claimed = await prisma.post.updateMany({
      where: {
        id: post.id,
        status: "SCHEDULED",
        scheduledAt: { lte: new Date() }
      },
      data: { status: "PUBLISHING", errorMessage: null }
    });

    if (!claimed.count) {
      results.push({ postId: post.id, status: "SKIPPED", error: "Post sudah diproses oleh worker lain." });
      continue;
    }

    try {
      const { published, attempts } = await publishPostWithRetry(post.id, 1);
      results.push({ postId: post.id, status: "PUBLISHED", igMediaId: published.id, attempts });
    } catch (error) {
      results.push({ postId: post.id, status: "FAILED", error: getErrorMessage(error) });
    }
  }

  return NextResponse.json({ checkedAt: new Date().toISOString(), count: duePosts.length, results });
}

export const POST = GET;
