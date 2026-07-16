"use client";

import { useQuery } from "@tanstack/react-query";

export type AnalyticsPost = {
  id: string;
  caption: string;
  mediaType: "IMAGE" | "CAROUSEL" | "REELS";
  publishedAt: string;
  igMediaId: string;
  thumbnailUrl: string | null;
  metrics: { likes: number; comments: number; plays: number; engagementRate: number; engagement: number };
};

export type AnalyticsResponse = {
  range: "7d" | "30d" | "mtd";
  noComparisonDataAvailable: boolean;
  period: { start: string; end: string; days: number };
  followers: number | null;
  summary: Record<"posts" | "followers" | "reactions" | "comments" | "engagementRate" | "views", { value: number | null; change: number | null }>;
  topPosts: AnalyticsPost[];
  posts: AnalyticsPost[];
  postsByDay: Array<{ date: string; image: number; carousel: number; reels: number; total: number }>;
  warnings: string[];
};

export function useAnalytics(range: AnalyticsResponse["range"], sortBy: "reactions" | "comments") {
  return useQuery({
    queryKey: ["analytics", range, sortBy],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?range=${range}&sortBy=${sortBy}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memuat analytics.");
      return data as AnalyticsResponse;
    },
    staleTime: 3 * 60 * 1000
  });
}
