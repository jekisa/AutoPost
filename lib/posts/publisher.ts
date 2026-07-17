import { decryptSecret } from "@/lib/crypto";
import { connectDB } from "@/lib/mongodb";
import {
  createMediaContainer,
  getPublishedMediaInfo,
  MetaGraphApiError,
  publishContainer,
  waitForContainerFinished
} from "@/lib/meta/instagram";
import { IgAccount } from "@/models/IgAccount";
import { Post } from "@/models/Post";
import { PublishLog } from "@/models/PublishLog";
import { createFacebookPhotoPost, createFacebookTextPost } from "@/lib/meta/facebook";

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
  request: unknown;
  response: unknown;
  status: "success" | "failed";
}) {
  await connectDB();
  await PublishLog.create(data);
}

async function assertDailyPublishLimit() {
  await connectDB();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const publishedCount = await Post.countDocuments({
    status: "PUBLISHED",
    publishedAt: { $gte: since }
  });

  if (publishedCount >= DAILY_PUBLISH_LIMIT) {
    throw new Error(
      `Batas publish Instagram ${DAILY_PUBLISH_LIMIT} post per 24 jam sudah tercapai. Coba lagi setelah jendela 24 jam bergeser.`
    );
  }
}

async function publishInstagramPost(postId: string) {
  await connectDB();
  const post = await Post.findById(postId);

  if (!post) throw new Error("Post tidak ditemukan.");
  if (!post.mediaAssets.length) throw new Error("Post belum memiliki media.");
  if (post.status === "PUBLISHED") throw new Error("Post ini sudah published dan tidak bisa dipublish ulang.");

  const mediaAssets = [...post.mediaAssets].sort((a, b) => a.order - b.order);
  const account = await IgAccount.findOne().sort({ updatedAt: -1 });
  if (!account) throw new Error("Instagram account belum dikonfigurasi di Settings.");

  await assertDailyPublishLimit();

  post.status = "PUBLISHING";
  post.errorMessage = null;
  await post.save();

  const accessToken = decryptSecret(account.accessToken);
  let creationId: string;

  if (post.mediaType === "IMAGE") {
    const image = mediaAssets[0];
    const container = await createMediaContainer(
      account.igUserId,
      { imageUrl: image.url, caption: post.caption },
      accessToken
    );
    creationId = container.id;
    await logPublish({
      postId: post._id.toString(),
      action: "create_media_container",
      request: { igUserId: account.igUserId, imageUrl: image.url, caption: post.caption },
      response: container,
      status: "success"
    });
  } else if (post.mediaType === "CAROUSEL") {
    const children: string[] = [];

    for (const item of mediaAssets) {
      const child = await createMediaContainer(
        account.igUserId,
        { imageUrl: item.url, isCarouselItem: true },
        accessToken
      );
      children.push(child.id);
      await logPublish({
        postId: post._id.toString(),
        action: "create_carousel_child",
        request: { igUserId: account.igUserId, imageUrl: item.url, isCarouselItem: true, order: item.order },
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
      postId: post._id.toString(),
      action: "create_carousel_parent",
      request: { igUserId: account.igUserId, mediaType: "CAROUSEL", children, caption: post.caption },
      response: parent,
      status: "success"
    });
  } else {
    const video = mediaAssets[0];
    const container = await createMediaContainer(
      account.igUserId,
      { videoUrl: video.url, caption: post.caption, mediaType: "REELS" },
      accessToken
    );
    creationId = container.id;
    await logPublish({
      postId: post._id.toString(),
      action: "create_reels_container",
      request: { igUserId: account.igUserId, videoUrl: video.url, caption: post.caption, mediaType: "REELS" },
      response: container,
      status: "success"
    });

    const status = await waitForContainerFinished(container.id, accessToken);
    await logPublish({
      postId: post._id.toString(),
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
      postId: post._id.toString(),
      action: "fetch_instagram_permalink",
      request: { mediaId: published.id, fields: "id,permalink" },
      response: { error: getErrorMessage(error) },
      status: "failed"
    });
  }

  post.status = "PUBLISHED";
  post.publishedAt = new Date();
  post.igMediaId = published.id;
  post.instagramPermalink = instagramPermalink;
  post.errorMessage = null;
  await post.save();

  await logPublish({
    postId: post._id.toString(),
    action: "publish_container",
    request: { igUserId: account.igUserId, creationId },
    response: { ...published, permalink: instagramPermalink },
    status: "success"
  });

  return published;
}

async function publishFacebookPost(postId: string) {
  await connectDB();
  const post = await Post.findById(postId);
  if (!post) throw new Error("Post tidak ditemukan.");
  const account = await IgAccount.findOne().sort({ updatedAt: -1 });
  if (!account?.pageId) throw new Error("Facebook Page belum dikonfigurasi di Settings.");
  const accessToken = decryptSecret(account.accessToken);
  const override = post.platformOverrides?.find((item) => item.platform === "facebook");
  const caption = override?.caption ?? post.baseCaption ?? post.caption;
  const assets = [...(override?.media?.length ? override.media : post.baseMedia?.length ? post.baseMedia : post.mediaAssets)].sort((a, b) => a.order - b.order);
  if (post.mediaType !== "IMAGE" && !override?.media?.length) throw new Error("Facebook untuk Carousel/Reels membutuhkan media override IMAGE atau akan di-skip.");
  const result = assets[0] ? await createFacebookPhotoPost(account.pageId, { imageUrl: assets[0].url, caption, accessToken }) : await createFacebookTextPost(account.pageId, { message: caption, accessToken });
  const externalId = result.post_id ?? result.id;
  if (!externalId) throw new Error("Facebook tidak mengembalikan ID post.");
  return { id: externalId };
}

export async function publishPost(postId: string) {
  await connectDB();
  const post = await Post.findById(postId);
  if (!post) throw new Error("Post tidak ditemukan.");
  const platforms = post.platforms?.length ? post.platforms : ["instagram"];
  const results = await Promise.allSettled(platforms.map(async (platform) => {
    const published = platform === "facebook" ? await publishFacebookPost(postId) : await publishInstagramPost(postId);
    return { platform, published };
  }));
  const platformResults = results.map((result, index) => result.status === "fulfilled"
    ? { platform: platforms[index], status: "PUBLISHED" as const, externalId: result.value.published.id, publishedAt: new Date() }
    : { platform: platforms[index], status: "FAILED" as const, errorMessage: getErrorMessage(result.reason) });
  const successCount = platformResults.filter((result) => result.status === "PUBLISHED").length;
  const status = successCount === platforms.length ? "PUBLISHED" : successCount ? "PARTIAL" : "FAILED";
  await Post.findByIdAndUpdate(postId, { platformResults, status, publishedAt: successCount ? new Date() : null, errorMessage: successCount ? null : platformResults.map((result) => result.errorMessage).filter(Boolean).join(" ") });
  const instagramResult = platformResults.find((result) => result.platform === "instagram" && result.status === "PUBLISHED");
  return { id: instagramResult?.externalId ?? platformResults.find((result) => result.status === "PUBLISHED")?.externalId ?? "", platformResults };
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
        await connectDB();
        await Post.findByIdAndUpdate(postId, { status: "FAILED", errorMessage: message });
        throw error;
      }
    }
  }

  throw new Error("Publish gagal.");
}
