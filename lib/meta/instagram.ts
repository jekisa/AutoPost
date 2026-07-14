const GRAPH_API_VERSION = "v23.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type MediaContainerInput = {
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  mediaType?: "REELS" | "CAROUSEL" | "CAROUSEL_ITEM";
  children?: string[];
};

export type MetaAccountInfo = {
  id: string;
  username?: string;
  name?: string;
};

export type ContainerStatus = {
  id: string;
  status_code?: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
};

export type PublishedMediaInfo = {
  id: string;
  permalink?: string;
};

type MetaErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export class MetaGraphApiError extends Error {
  status: number;
  body: MetaErrorBody;

  constructor(status: number, body: MetaErrorBody) {
    super(body.error?.message ?? `Meta Graph API request failed with status ${status}`);
    this.name = "MetaGraphApiError";
    this.status = status;
    this.body = body;
  }
}

async function graphRequest<T>(
  path: string,
  accessToken: string,
  init?: Omit<RequestInit, "body"> & { body?: URLSearchParams }
) {
  const url = new URL(`${GRAPH_API_BASE}${path}`);

  if (!init?.method || init.method === "GET") {
    url.searchParams.set("access_token", accessToken);
  }

  const body = init?.body;
  if (body && init?.method !== "GET") {
    body.set("access_token", accessToken);
  }

  const response = await fetch(url, {
    ...init,
    body,
    headers: {
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...init?.headers
    },
    cache: "no-store"
  });

  const json = (await response.json()) as T & MetaErrorBody;
  if (!response.ok) {
    throw new MetaGraphApiError(response.status, json);
  }

  return json as T;
}

export async function createMediaContainer(
  igUserId: string,
  input: MediaContainerInput,
  accessToken: string
) {
  const body = new URLSearchParams();

  if (input.imageUrl) body.set("image_url", input.imageUrl);
  if (input.videoUrl) body.set("video_url", input.videoUrl);
  if (input.caption) body.set("caption", input.caption);
  if (input.mediaType) body.set("media_type", input.mediaType);
  if (input.children?.length) body.set("children", input.children.join(","));

  return graphRequest<{ id: string }>(`/${igUserId}/media`, accessToken, {
    method: "POST",
    body
  });
}

export async function publishContainer(igUserId: string, creationId: string, accessToken: string) {
  const body = new URLSearchParams({ creation_id: creationId });

  return graphRequest<{ id: string }>(`/${igUserId}/media_publish`, accessToken, {
    method: "POST",
    body
  });
}

export async function getPublishedMediaInfo(mediaId: string, accessToken: string) {
  return graphRequest<PublishedMediaInfo>(
    `/${mediaId}?fields=${encodeURIComponent("id,permalink")}`,
    accessToken
  );
}

export async function checkContainerStatus(containerId: string, accessToken: string) {
  return graphRequest<ContainerStatus>(
    `/${containerId}?fields=${encodeURIComponent("id,status_code")}`,
    accessToken
  );
}

export async function waitForContainerFinished(
  containerId: string,
  accessToken: string,
  options: { timeoutMs?: number; intervalMs?: number } = {}
) {
  const timeoutMs = options.timeoutMs ?? 180_000;
  const intervalMs = options.intervalMs ?? 5_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const status = await checkContainerStatus(containerId, accessToken);

    if (status.status_code === "FINISHED" || status.status_code === "PUBLISHED") {
      return status;
    }

    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(`Meta gagal memproses media video. Status container: ${status.status_code}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timeout menunggu Meta memproses video setelah ${Math.round(timeoutMs / 1000)} detik. Coba lagi beberapa saat lagi.`
  );
}

export async function getAccountInfo(igUserId: string, accessToken: string) {
  return graphRequest<MetaAccountInfo>(
    `/${igUserId}?fields=${encodeURIComponent("id,username,name")}`,
    accessToken
  );
}
