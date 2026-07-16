import { addDays, differenceInCalendarDays, subDays } from "date-fns";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { getErrorMessage } from "@/lib/posts/publisher";
import { getAccountInfo, getMediaInsights } from "@/lib/meta/instagram";
import { connectDB } from "@/lib/mongodb";
import { getNowInWIB, getWIBDateKey, startOfWIBDayAsUTC, startOfWIBMonthAsUTC } from "@/lib/timezone";
import { IgAccount } from "@/models/IgAccount";
import { Post } from "@/models/Post";

type RangeKey = "7d" | "30d" | "mtd";
type MetricKey = "posts" | "followers" | "reactions" | "comments" | "engagementRate" | "views";

type AnalyticsPost = {
  id: string;
  caption: string;
  mediaType: "IMAGE" | "CAROUSEL" | "REELS";
  publishedAt: string;
  igMediaId: string;
  thumbnailUrl: string | null;
  metrics: { likes: number; comments: number; plays: number; engagementRate: number; engagement: number };
};

function isValidMediaId(value: unknown): value is string {
  return typeof value === "string" && /^\d{8,}$/.test(value);
}

function getRange(range: RangeKey) {
  const now = getNowInWIB();
  const todayStart = startOfWIBDayAsUTC(now);
  const end = addDays(todayStart, 1);
  const start = range === "mtd" ? startOfWIBMonthAsUTC(now.getFullYear(), now.getMonth()) : subDays(todayStart, range === "30d" ? 29 : 6);
  const days = Math.max(1, differenceInCalendarDays(end, start));
  return { start, end, previousStart: subDays(start, days), previousEnd: start, days };
}

function emptyMetrics() {
  return { likes: 0, comments: 0, plays: 0, engagementRate: 0, engagement: 0 };
}

async function loadPost(post: any, accessToken: string): Promise<AnalyticsPost | null> {
  if (!isValidMediaId(post.igMediaId)) return null;
  const insights = await getMediaInsights(post.igMediaId, post.mediaType, accessToken);
  const likes = Number(insights.metrics.likes ?? 0);
  const comments = Number(insights.metrics.comments ?? 0);
  const plays = Number(insights.metrics.plays ?? 0);
  const engagement = likes + comments + Number(insights.metrics.saved ?? 0);
  const reach = Number(insights.metrics.reach ?? 0);
  return {
    id: post._id.toString(),
    caption: post.caption,
    mediaType: post.mediaType,
    publishedAt: post.publishedAt.toISOString(),
    igMediaId: post.igMediaId,
    thumbnailUrl: post.mediaAssets?.[0]?.url ?? null,
    metrics: { likes, comments, plays, engagementRate: reach > 0 ? engagement / reach : 0, engagement }
  };
}

function sum(posts: AnalyticsPost[]) {
  const total = posts.reduce((result, post) => {
    result.likes += post.metrics.likes;
    result.comments += post.metrics.comments;
    result.plays += post.metrics.plays;
    result.engagement += post.metrics.engagement;
    result.engagementRate += post.metrics.engagementRate;
    return result;
  }, { likes: 0, comments: 0, plays: 0, engagement: 0, engagementRate: 0 });
  return { ...total, averageRate: posts.length ? total.engagementRate / posts.length : 0 };
}

function trend(current: number, previous: number, previousPostCount: number) {
  if (!previousPostCount || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestedRange = new URL(request.url).searchParams.get("range");
  const range: RangeKey = requestedRange === "30d" || requestedRange === "mtd" ? requestedRange : "7d";
  const period = getRange(range);

  await connectDB();
  const [account, posts] = await Promise.all([
    IgAccount.findOne().sort({ updatedAt: -1 }),
    Post.find({ status: "PUBLISHED", publishedAt: { $gte: period.previousStart, $lt: period.end } }).sort({ publishedAt: 1 }).lean()
  ]);

  const currentPosts = posts.filter((post) => post.publishedAt && post.publishedAt >= period.start && post.publishedAt < period.end);
  const previousPosts = posts.filter((post) => post.publishedAt && post.publishedAt >= period.previousStart && post.publishedAt < period.previousEnd);
  const warnings: string[] = [];
  const validCurrentPosts = currentPosts.filter((post) => isValidMediaId(post.igMediaId));
  if (currentPosts.some((post) => !isValidMediaId(post.igMediaId))) warnings.push("Sebagian post dilewati karena memakai ID media demo/invalid.");

  let accessToken = "";
  let followers: number | null = null;
  if (account) {
    try {
      accessToken = decryptSecret(account.accessToken);
      const accountInfo = await getAccountInfo(account.igUserId, accessToken);
      followers = Number(accountInfo.followers_count ?? 0);
    } catch (error) {
      warnings.push(`Followers tidak dapat dimuat: ${getErrorMessage(error)}`);
    }
  } else {
    warnings.push("Instagram account belum dikonfigurasi di Settings.");
  }

  const loadMany = async (items: typeof validCurrentPosts) => {
    if (!accessToken) return [];
    const results = await Promise.allSettled(items.map((post) => loadPost(post, accessToken)));
    results.forEach((result) => {
      if (result.status === "rejected") warnings.push(getErrorMessage(result.reason));
    });
    return results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  };

  const current = await loadMany(validCurrentPosts);
  const previous = await loadMany(previousPosts.filter((post) => isValidMediaId(post.igMediaId)));
  const currentTotals = sum(current);
  const previousTotals = sum(previous);
  const chartMap = new Map<string, { date: string; image: number; carousel: number; reels: number; total: number }>();
  current.forEach((post) => {
    const date = getWIBDateKey(post.publishedAt);
    const row = chartMap.get(date) ?? { date, image: 0, carousel: 0, reels: 0, total: 0 };
    row[post.mediaType === "IMAGE" ? "image" : post.mediaType === "CAROUSEL" ? "carousel" : "reels"] += 1;
    row.total += 1;
    chartMap.set(date, row);
  });

  return NextResponse.json({
    range,
    period: { start: period.start.toISOString(), end: period.end.toISOString(), days: period.days },
    followers,
    summary: {
      posts: { value: current.length, change: trend(current.length, previous.length, previous.length) },
      followers: { value: followers, change: null },
      reactions: { value: currentTotals.likes, change: trend(currentTotals.likes, previousTotals.likes, previous.length) },
      comments: { value: currentTotals.comments, change: trend(currentTotals.comments, previousTotals.comments, previous.length) },
      engagementRate: { value: currentTotals.averageRate, change: trend(currentTotals.averageRate, previousTotals.averageRate, previous.length) },
      views: { value: currentTotals.plays, change: trend(currentTotals.plays, previousTotals.plays, previous.length) }
    },
    topPosts: [...current].sort((a, b) => b.metrics.engagement - a.metrics.engagement).slice(0, 5),
    posts: current,
    postsByDay: [...chartMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    warnings: [...new Set(warnings)].slice(0, 8)
  });
}
