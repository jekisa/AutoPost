"use client";

import { useQuery } from "@tanstack/react-query";

export type EngagementPost = {
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
};

export type EngagementDashboardResponse = {
  summary: {
    likes: number;
    comments: number;
    saves: number;
    reach: number;
    plays: number;
    averageEngagementRate: number;
  };
  topPosts: EngagementPost[];
  posts: EngagementPost[];
  warnings: string[];
  unavailableCount: number;
  error?: string;
};

export function useEngagementDashboard() {
  return useQuery({
    queryKey: ["engagement-dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/engagement");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memuat engagement.");
      return data as EngagementDashboardResponse;
    },
    staleTime: 3 * 60 * 1000
  });
}
