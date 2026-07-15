"use client";

import { useQuery } from "@tanstack/react-query";
import type { PostListItem } from "@/hooks/usePosts";

export function useCalendarPosts(year: number, month: number) {
  return useQuery({
    queryKey: ["calendar-posts", year, month],
    queryFn: async () => {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      const response = await fetch(`/api/posts/calendar?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memuat kalender.");
      return data.data as PostListItem[];
    }
  });
}
