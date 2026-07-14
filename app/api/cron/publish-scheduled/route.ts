import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getErrorMessage, publishPostWithRetry } from "@/lib/posts/publisher";
import { Post } from "@/models/Post";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const duePosts = await Post.find({
      status: "SCHEDULED",
      scheduledAt: { $lte: new Date() }
    })
      .sort({ scheduledAt: 1 })
      .limit(10);

    const results = [];

    for (const post of duePosts) {
      const claimed = await Post.findOneAndUpdate(
        {
          _id: post._id,
          status: "SCHEDULED",
          scheduledAt: { $lte: new Date() }
        },
        { status: "PUBLISHING", errorMessage: null },
        { new: true }
      );

      if (!claimed) {
        results.push({ postId: post._id.toString(), status: "SKIPPED", error: "Post sudah diproses oleh worker lain." });
        continue;
      }

      try {
        const { published, attempts } = await publishPostWithRetry(post._id.toString(), 1);
        results.push({ postId: post._id.toString(), status: "PUBLISHED", igMediaId: published.id, attempts });
      } catch (error) {
        results.push({ postId: post._id.toString(), status: "FAILED", error: getErrorMessage(error) });
      }
    }

    return NextResponse.json({ checkedAt: new Date().toISOString(), count: duePosts.length, results });
  } catch (error) {
    console.error("Cron publish-scheduled failed", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export const POST = GET;
