import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { startOfWIBDayAsUTC } from "@/lib/timezone";
import { Post, POST_STATUSES } from "@/models/Post";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const sortableFields = new Set(["createdAt", "status"]);

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const status = searchParams.get("status");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDirection = searchParams.get("sortDirection") === "asc" ? 1 : -1;

  const filter: Record<string, unknown> =
    status && POST_STATUSES.includes(status as (typeof POST_STATUSES)[number])
      ? { status }
      : {};
  const sort: Record<string, 1 | -1> = sortableFields.has(sortBy) ? { [sortBy]: sortDirection } : { createdAt: -1 };

  await connectDB();
  const todayWIBStart = startOfWIBDayAsUTC(new Date());

  const [posts, totalCount, allCount, publishedToday, scheduledUpcoming, failedCount] = await Promise.all([
    Post.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Post.countDocuments(filter),
    Post.countDocuments(),
    Post.countDocuments({ status: "PUBLISHED", publishedAt: { $gte: todayWIBStart } }),
    Post.countDocuments({ status: "SCHEDULED", scheduledAt: { $gte: new Date() } }),
    Post.countDocuments({ status: "FAILED" })
  ]);

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
      updatedAt: post.updatedAt.toISOString(),
      mediaAssets: post.mediaAssets
        .sort((a, b) => a.order - b.order)
        .map((asset) => ({
          id: asset._id.toString(),
          url: asset.url,
          order: asset.order,
          type: asset.type
        }))
    })),
    totalCount,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    summary: {
      total: allCount,
      publishedToday,
      scheduledUpcoming,
      failed: failedCount
    }
  });
}
