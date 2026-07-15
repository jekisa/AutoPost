import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { connectDB } from "@/lib/mongodb";
import { getErrorMessage } from "@/lib/posts/publisher";
import { getMediaInsights } from "@/lib/meta/instagram";
import { IgAccount } from "@/models/IgAccount";
import { Post } from "@/models/Post";

type EngagementPost = {
  id: string;
  caption: string;
  mediaType: "IMAGE" | "CAROUSEL" | "REELS";
  publishedAt: string | null;
  instagramPermalink: string | null;
  thumbnailUrl: string | null;
  mediaCount: number;
  metrics: {
    likes: number;
    comments: number;
    saves: number;
    reach: number;
    plays: number;
    shares: number;
    engagement: number;
    engagementRate: number;
  };
  error?: string;
  unavailableReason?: "invalid_media_id";
  unavailableMetrics?: string[];
};

function value(metrics: Record<string, number>, key: string) {
  return Number(metrics[key] ?? 0);
}

function isValidInstagramMediaId(value: unknown) {
  return typeof value === "string" && /^\d{8,}$/.test(value);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const [account, posts] = await Promise.all([
    IgAccount.findOne().sort({ updatedAt: -1 }),
    Post.find({ status: "PUBLISHED", igMediaId: { $ne: null } }).sort({ publishedAt: 1 }).lean()
  ]);

  if (!posts.length) {
    return NextResponse.json({
      summary: { likes: 0, comments: 0, saves: 0, reach: 0, plays: 0, averageEngagementRate: 0 },
      topPosts: [],
      posts: [],
      warnings: [],
      unavailableCount: 0
    });
  }

  if (!account) {
    return NextResponse.json(
      {
        error: "Instagram account belum dikonfigurasi di Settings.",
        summary: { likes: 0, comments: 0, saves: 0, reach: 0, plays: 0, averageEngagementRate: 0 },
        topPosts: [],
        posts: [],
        warnings: ["Instagram account belum dikonfigurasi di Settings."],
        unavailableCount: 0
      },
      { status: 200 }
    );
  }

  const accessToken = decryptSecret(account.accessToken);
  const validPosts = posts.filter((post) => isValidInstagramMediaId(post.igMediaId));
  const unavailablePosts: EngagementPost[] = posts
    .filter((post) => !isValidInstagramMediaId(post.igMediaId))
    .map((post) => ({
      id: post._id.toString(),
      caption: post.caption,
      mediaType: post.mediaType,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      instagramPermalink: post.instagramPermalink ?? null,
      thumbnailUrl: post.mediaAssets[0]?.url ?? null,
      mediaCount: post.mediaAssets.length,
      metrics: {
        likes: 0,
        comments: 0,
        saves: 0,
        reach: 0,
        plays: 0,
        shares: 0,
        engagement: 0,
        engagementRate: 0
      },
      unavailableReason: "invalid_media_id"
    }));
  const results = await Promise.allSettled(
    validPosts.map(async (post): Promise<EngagementPost> => {
      const insights = await getMediaInsights(post.igMediaId as string, post.mediaType, accessToken);
      const likes = value(insights.metrics, "likes");
      const comments = value(insights.metrics, "comments");
      const saves = value(insights.metrics, "saved");
      const reach = value(insights.metrics, "reach");
      const plays = value(insights.metrics, "plays");
      const shares = value(insights.metrics, "shares");
      const engagement = likes + comments + saves;

      return {
        id: post._id.toString(),
        caption: post.caption,
        mediaType: post.mediaType,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        instagramPermalink: post.instagramPermalink ?? null,
        thumbnailUrl: post.mediaAssets[0]?.url ?? null,
        mediaCount: post.mediaAssets.length,
        metrics: {
          likes,
          comments,
          saves,
          reach,
          plays,
          shares,
          engagement,
          engagementRate: reach > 0 ? engagement / reach : 0
        },
        unavailableMetrics: insights.unavailableMetrics
      };
    })
  );

  const engagementPosts: EngagementPost[] = results.map((result, index) => {
    const post = validPosts[index];
    if (result.status === "fulfilled") return result.value;

    return {
      id: post._id.toString(),
      caption: post.caption,
      mediaType: post.mediaType,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      instagramPermalink: post.instagramPermalink ?? null,
      thumbnailUrl: post.mediaAssets[0]?.url ?? null,
      mediaCount: post.mediaAssets.length,
      metrics: {
        likes: 0,
        comments: 0,
        saves: 0,
        reach: 0,
        plays: 0,
        shares: 0,
        engagement: 0,
        engagementRate: 0
      },
      error: getErrorMessage(result.reason)
    };
  });
  engagementPosts.push(...unavailablePosts);

  const successfulPosts = engagementPosts.filter((post) => !post.error && !post.unavailableReason);
  const totals = successfulPosts.reduce(
    (acc, post) => {
      acc.likes += post.metrics.likes;
      acc.comments += post.metrics.comments;
      acc.saves += post.metrics.saves;
      acc.reach += post.metrics.reach;
      acc.plays += post.metrics.plays;
      return acc;
    },
    { likes: 0, comments: 0, saves: 0, reach: 0, plays: 0 }
  );
  const totalEngagement = totals.likes + totals.comments + totals.saves;
  const warnings = Array.from(
    new Set(
      engagementPosts
        .flatMap((post) => [
          ...(post.error ? [post.error] : []),
          ...(post.unavailableMetrics?.length ? [`Metric tidak tersedia: ${post.unavailableMetrics.join(", ")}`] : [])
        ])
        .filter(Boolean)
    )
  );

  return NextResponse.json({
    summary: {
      ...totals,
      averageEngagementRate: totals.reach > 0 ? totalEngagement / totals.reach : 0
    },
    topPosts: [...successfulPosts].sort((a, b) => b.metrics.engagementRate - a.metrics.engagementRate).slice(0, 5),
    posts: engagementPosts,
    warnings,
    unavailableCount: unavailablePosts.length
  });
}
