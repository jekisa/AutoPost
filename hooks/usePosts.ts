"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";
export type PostMediaType = "IMAGE" | "CAROUSEL" | "REELS";
export type AssetType = "IMAGE" | "VIDEO";

export type PostListItem = {
  id: string;
  caption: string;
  mediaType: PostMediaType;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  igMediaId: string | null;
  instagramPermalink: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  mediaAssets: Array<{
    id: string;
    url: string;
    order: number;
    type: AssetType;
  }>;
};

export type PostsResponse = {
  data: PostListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary: {
    total: number;
    publishedToday: number;
    scheduledUpcoming: number;
    failed: number;
  };
};

export type PostsParams = {
  status?: PostStatus;
  page: number;
  pageSize: number;
  sortBy: "createdAt" | "status";
  sortDirection: "asc" | "desc";
};

export const postsQueryKey = (params: PostsParams) => ["posts", params] as const;

export function usePosts(params: PostsParams) {
  return useQuery({
    queryKey: postsQueryKey(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
        sortBy: params.sortBy,
        sortDirection: params.sortDirection
      });
      if (params.status) searchParams.set("status", params.status);

      const response = await fetch(`/api/posts?${searchParams.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memuat post.");
      return data as PostsResponse;
    },
    placeholderData: (previousData) => previousData
  });
}

export function useRetryPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}/retry`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Retry gagal.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    }
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/posts/publish", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan post.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    }
  });
}
