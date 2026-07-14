import type { Prisma } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";
import {
  createMediaContainer,
  getPublishedMediaInfo,
  MetaGraphApiError,
  publishContainer,
  waitForContainerFinished
} from "@/lib/meta/instagram";
import { prisma } from "@/lib/prisma";

const TRANSIENT_META_CODES = new Set([1, 2, 4, 17, 32, 613]);
const DAILY_PUBLISH_LIMIT = 25;

export function getErrorMessage(error: unknown) {
  if (error instanceof MetaGraphApiError) {
    const code = error.body.error?.code;
    const lowerMessage = error.message.toLowerCase();
    if (code === 190 || lowerMessage.includes("access token") || lowerMessage.includes("token")) {
      return `${error.message} Refresh access token Meta di halaman Settings, lalu coba retry.`;
    }
  }

  return error instanceof Error ? error.message : "Publish gagal.";
}

export function isTransientPublishError(error: unknown) {
  if (error instanceof MetaGraphApiError) {
    const code = error.body.error?.code;
    const message = error.message.toLowerCase();
    return (
      error.status >= 500 ||
      error.status === 429 ||
      (typeof code === "number" && TRANSIENT_META_CODES.has(code)) ||
      message.includes("rate limit") ||
      message.includes("temporar") ||
      message.includes("try again")
    );
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("timeout") || message.includes("temporar") || message.includes("try again");
  }

  return false;
}

async function logPublish(data: {
  postId: string;
  action: string;
  request: Prisma.InputJsonValue;
  response: Prisma.InputJsonValue;
  status: "success" | "failed";
}) {
  await prisma.publishLog.create({ data });
}

async function assertDailyPublishLimit() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const publishedCount = await prisma.post.count({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: since }
    }
  });

  if (publishedCount >= DAILY_PUBLISH_LIMIT) {
    throw new Error(
      `Batas publish Instagram ${DAILY_PUBLISH_LIMIT} post per 24 jam sudah tercapai. Coba lagi setelah jendela 24 jam bergeser.`
    );
  }
}

export async function publishPost(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { mediaAssets: { orderBy: { order: "asc" } } }
  });

  if (!post) throw new Error("Post tidak ditemukan.");
  if (!post.mediaAssets.length) throw new Error("Post belum memiliki media.");
  if (post.status === "PUBLISHED") throw new Error("Post ini sudah published dan tidak bisa dipublish ulang.");

  const account = await prisma.igAccount.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!account) throw new Error("Instagram account belum dikonfigurasi di Settings.");

  await assertDailyPublishLimit();

  await prisma.post.update({
    where: { id: post.id },
    data: { status: "PUBLISHING", errorMessage: null }
  });

  const accessToken = decryptSecret(account.accessToken);
  let creationId: string;

  if (post.mediaType === "IMAGE") {
    const image = post.mediaAssets[0];
    const container = await createMediaContainer(
      account.igUserId,
      { imageUrl: image.url, caption: post.caption },
      accessToken
    );
    creationId = container.id;
    await logPublish({
      postId: post.id,
      action: "create_media_container",
      request: { igUserId: account.igUserId, imageUrl: image.url, caption: post.caption },
      response: container,
      status: "success"
    });
  } else if (post.mediaType === "CAROUSEL") {
    const children: string[] = [];

    for (const item of post.mediaAssets) {
      const child = await createMediaContainer(
        account.igUserId,
        { imageUrl: item.url, mediaType: "CAROUSEL_ITEM" },
        accessToken
      );
      children.push(child.id);
      await logPublish({
        postId: post.id,
        action: "create_carousel_child",
        request: { igUserId: account.igUserId, imageUrl: item.url, mediaType: "CAROUSEL_ITEM", order: item.order },
        response: child,
        status: "success"
      });
    }

    const parent = await createMediaContainer(
      account.igUserId,
      { caption: post.caption, mediaType: "CAROUSEL", children },
      accessToken
    );
    creationId = parent.id;
    await logPublish({
      postId: post.id,
      action: "create_carousel_parent",
      request: { igUserId: account.igUserId, mediaType: "CAROUSEL", children, caption: post.caption },
      response: parent,
      status: "success"
    });
  } else {
    const video = post.mediaAssets[0];
    const container = await createMediaContainer(
      account.igUserId,
      { videoUrl: video.url, caption: post.caption, mediaType: "REELS" },
      accessToken
    );
    creationId = container.id;
    await logPublish({
      postId: post.id,
      action: "create_reels_container",
      request: { igUserId: account.igUserId, videoUrl: video.url, caption: post.caption, mediaType: "REELS" },
      response: container,
      status: "success"
    });

    const status = await waitForContainerFinished(container.id, accessToken);
    await logPublish({
      postId: post.id,
      action: "poll_reels_container",
      request: { containerId: container.id, fields: "status_code" },
      response: status,
      status: "success"
    });
  }

  const published = await publishContainer(account.igUserId, creationId, accessToken);
  let instagramPermalink: string | null = null;

  try {
    const publishedInfo = await getPublishedMediaInfo(published.id, accessToken);
    instagramPermalink = publishedInfo.permalink ?? null;
  } catch (error) {
    await logPublish({
      postId: post.id,
      action: "fetch_instagram_permalink",
      request: { mediaId: published.id, fields: "id,permalink" },
      response: { error: getErrorMessage(error) },
      status: "failed"
    });
  }

  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      igMediaId: published.id,
      instagramPermalink,
      errorMessage: null
    }
  });

  await logPublish({
    postId: post.id,
    action: "publish_container",
    request: { igUserId: account.igUserId, creationId },
    response: { ...published, permalink: instagramPermalink },
    status: "success"
  });

  return published;
}

export async function publishPostWithRetry(postId: string, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const published = await publishPost(postId);
      return { published, attempts: attempt + 1 };
    } catch (error) {
      const message = getErrorMessage(error);
      await logPublish({
        postId,
        action: attempt < retries && isTransientPublishError(error) ? "publish_retry" : "publish_post",
        request: { postId, attempt: attempt + 1 },
        response: { error: message },
        status: "failed"
      });

      if (attempt >= retries || !isTransientPublishError(error)) {
        await prisma.post.update({
          where: { id: postId },
          data: { status: "FAILED", errorMessage: message }
        });
        throw error;
      }
    }
  }

  throw new Error("Publish gagal.");
}
