"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type OverviewComment = { id: string; username: string; text: string; timestamp: string; postId: string; thumbnailUrl: string | null; unread?: boolean };
export type OverviewPost = { id: string; caption: string; mediaType: "IMAGE" | "CAROUSEL" | "REELS"; status: "SCHEDULED" | "PUBLISHED"; scheduledAt: string | null; publishedAt: string | null; igMediaId: string | null; instagramPermalink: string | null; errorMessage: string | null; createdAt: string; updatedAt: string; mediaAssets: Array<{ id: string; url: string; order: number; type: "IMAGE" | "VIDEO" }> };
export type DashboardOverviewResponse = {
  greeting: { name: string; label?: string };
  today: string;
  summary: { streak: number; currentWeekPosts: number; target: number | null; progressStatus: string; commentAverage: number; commentScore: string };
  history: Array<{ posts: number; commentAverage: number }>;
  weeklyPulse: { posts: number; postsChange: number | null; followers: number | null; comments: number; previousComments: number };
  upcoming: OverviewPost[];
  comments: { items: OverviewComment[]; unreadCount: number };
  warnings: string[];
};

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard-overview");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memuat dashboard.");
      return data as DashboardOverviewResponse;
    },
    staleTime: 60 * 1000
  });
}

export function useSaveWeeklyGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (targetPostsPerWeek: number) => {
      const response = await fetch("/api/dashboard-overview/goal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetPostsPerWeek }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan goal.");
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["dashboard-overview"] })
  });
}

export function useMarkCommentsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => { await fetch("/api/dashboard-overview/read", { method: "POST" }); },
    onSuccess: () => client.invalidateQueries({ queryKey: ["dashboard-overview"] })
  });
}
