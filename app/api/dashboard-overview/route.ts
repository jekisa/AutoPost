import { addDays, startOfWeek, subDays } from "date-fns";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { getErrorMessage } from "@/lib/posts/publisher";
import { getAccountInfo, getMediaComments } from "@/lib/meta/instagram";
import { connectDB } from "@/lib/mongodb";
import { getNowInWIB, getWIBDateKey, startOfWIBDayAsUTC, toWIBDate } from "@/lib/timezone";
import { IgAccount } from "@/models/IgAccount";
import { Post } from "@/models/Post";
import { WeeklyGoal } from "@/models/WeeklyGoal";

function weekStart(date: Date) {
  return startOfWIBDayAsUTC(startOfWeek(toWIBDate(date), { weekStartsOn: 1 }));
}

function mediaIdIsValid(value: unknown): value is string {
  return typeof value === "string" && /^\d{8,}$/.test(value);
}

function percentage(current: number, previous: number) {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const currentWeek = weekStart(now);
  const nextWeek = addDays(currentWeek, 7);
  const historyStart = subDays(currentWeek, 56);
  await connectDB();
  const [account, goal, published, scheduled] = await Promise.all([
    IgAccount.findOne().sort({ updatedAt: -1 }),
    WeeklyGoal.findOne(),
    Post.find({ status: "PUBLISHED", publishedAt: { $gte: historyStart, $lt: nextWeek } }).sort({ publishedAt: -1 }).lean(),
    Post.find({ status: "SCHEDULED", scheduledAt: { $gt: now } }).sort({ scheduledAt: 1 }).limit(10).lean()
  ]);

  const warnings: string[] = [];
  let accessToken = "";
  let followers: number | null = null;
  if (account) {
    try {
      accessToken = decryptSecret(account.accessToken);
      const info = await getAccountInfo(account.igUserId, accessToken);
      followers = Number(info.followers_count ?? 0);
    } catch (error) {
      warnings.push(`Followers tidak dapat dimuat: ${getErrorMessage(error)}`);
    }
  } else warnings.push("Instagram account belum dikonfigurasi di Settings.");

  const commentCounts = new Map<string, number>();
  const recentComments: Array<{ id: string; username: string; text: string; timestamp: string; postId: string; thumbnailUrl: string | null; unread?: boolean }> = [];
  if (accessToken) {
    const candidates = published.filter((post) => mediaIdIsValid(post.igMediaId)).slice(0, 80);
    const results = await Promise.allSettled(candidates.map(async (post) => ({ post, comments: await getMediaComments(post.igMediaId as string, accessToken) })));
    results.forEach((result) => {
      if (result.status === "rejected") return;
      const { post, comments } = result.value;
      commentCounts.set(post._id.toString(), comments.length);
      comments.forEach((comment) => {
        if (comment.timestamp && comment.text) recentComments.push({ id: comment.id, username: comment.username ?? "Instagram user", text: comment.text, timestamp: comment.timestamp, postId: post._id.toString(), thumbnailUrl: post.mediaAssets[0]?.url ?? null });
      });
    });
  }
  recentComments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const seenAt = account?.lastCommentsSeenAt?.getTime() ?? 0;
  const currentWeekPosts = published.filter((post) => post.publishedAt && post.publishedAt >= currentWeek && post.publishedAt < nextWeek);
  const previousWeekStart = subDays(currentWeek, 7);
  const previousWeekPosts = published.filter((post) => post.publishedAt && post.publishedAt >= previousWeekStart && post.publishedAt < currentWeek);
  const currentComments = currentWeekPosts.reduce((sum, post) => sum + (commentCounts.get(post._id.toString()) ?? 0), 0);
  const previousComments = previousWeekPosts.reduce((sum, post) => sum + (commentCounts.get(post._id.toString()) ?? 0), 0);

  const weekCounts = new Map<string, number>();
  published.forEach((post) => { if (post.publishedAt) { const key = getWIBDateKey(weekStart(post.publishedAt)); weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1); } });
  let streak = 0;
  for (let index = 0; index < 52; index += 1) {
    if ((weekCounts.get(getWIBDateKey(subDays(currentWeek, index * 7))) ?? 0) === 0) break;
    streak += 1;
  }

  const fourWeeksAgo = subDays(currentWeek, 28);
  const eightWeeksAgo = subDays(currentWeek, 56);
  const recentFour = published.filter((post) => post.publishedAt && post.publishedAt >= fourWeeksAgo && post.publishedAt < nextWeek);
  const previousFour = published.filter((post) => post.publishedAt && post.publishedAt >= eightWeeksAgo && post.publishedAt < fourWeeksAgo);
  const recentAverage = recentFour.length ? recentFour.reduce((sum, post) => sum + (commentCounts.get(post._id.toString()) ?? 0), 0) / recentFour.length : 0;
  const previousAverage = previousFour.length ? previousFour.reduce((sum, post) => sum + (commentCounts.get(post._id.toString()) ?? 0), 0) / previousFour.length : 0;
  const commentChange = previousAverage > 0 ? ((recentAverage - previousAverage) / previousAverage) * 100 : 0;
  const commentScore = !recentFour.length || !previousFour.length ? "Not enough data yet" : commentChange > 20 ? "Trending up" : commentChange < -20 ? "Needs attention" : recentAverage >= previousAverage ? "Nice and consistent" : "Steady";
  const target = goal?.targetPostsPerWeek ?? null;
  const progress = target ? currentWeekPosts.length / target : 0;
  const weekProgressStatus = !currentWeekPosts.length ? "Let's get started" : target && progress >= 1 ? "Well ahead of schedule" : target && progress >= 0.7 ? "On track" : "Catching up";

  return NextResponse.json({
    greeting: { name: process.env.ADMIN_NAME || (process.env.ADMIN_EMAIL ?? "Admin").split("@")[0].split(/[._-]/).map((part) => part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : "").join(" ") },
    today: now.toISOString(),
    summary: { streak, currentWeekPosts: currentWeekPosts.length, target, progressStatus: weekProgressStatus, commentAverage: recentAverage, commentScore },
    weeklyPulse: { posts: currentWeekPosts.length, postsChange: percentage(currentWeekPosts.length, previousWeekPosts.length), followers, comments: currentComments, previousComments },
    upcoming: scheduled.map((post) => ({ id: post._id.toString(), caption: post.caption, mediaType: post.mediaType, scheduledAt: post.scheduledAt?.toISOString() ?? null, publishedAt: post.publishedAt?.toISOString() ?? null, status: post.status, igMediaId: post.igMediaId, instagramPermalink: post.instagramPermalink, errorMessage: post.errorMessage, createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString(), mediaAssets: post.mediaAssets.map((asset) => ({ id: asset._id.toString(), url: asset.url, order: asset.order, type: asset.type })) })),
    comments: { items: recentComments.slice(0, 30).map((comment) => ({ ...comment, unread: new Date(comment.timestamp).getTime() > seenAt })), unreadCount: recentComments.filter((comment) => new Date(comment.timestamp).getTime() > seenAt).length },
    warnings
  });
}
