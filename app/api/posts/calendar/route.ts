import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post";

function parseMonth(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 11 ? parsed : new Date().getMonth();
}

function parseYear(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : new Date().getFullYear();
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = parseYear(searchParams.get("year"));
  const month = parseMonth(searchParams.get("month"));
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  await connectDB();
  const posts = await Post.find({
    $or: [
      { scheduledAt: { $gte: start, $lt: end } },
      { publishedAt: { $gte: start, $lt: end } }
    ]
  })
    .sort({ scheduledAt: 1, publishedAt: 1, createdAt: 1 })
    .lean();

  return NextResponse.json({
    data: posts.map((post) => ({
      id: post._id.toString(),
      caption: post.caption,
      mediaType: post.mediaType,
      status: post.status,
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      igMediaId: post.igMediaId,
      instagramPermalink: post.instagramPermalink,
      errorMessage: post.errorMessage,
      createdAt: post.createdAt.toISOString(),
      mediaAssets: post.mediaAssets
        .sort((a, b) => a.order - b.order)
        .map((asset) => ({
          id: asset._id.toString(),
          url: asset.url,
          order: asset.order,
          type: asset.type
        }))
    }))
  });
}
