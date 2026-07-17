import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getErrorMessage, publishPostWithRetry } from "@/lib/posts/publisher";
import { convertWIBInputToUTC } from "@/lib/timezone";
import { Post } from "@/models/Post";
import { PublishLog } from "@/models/PublishLog";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

const schema = z.object({
  caption: z.string().min(1).max(2200),
  mediaType: z.enum(["IMAGE", "CAROUSEL", "REELS"]),
  publishMode: z.enum(["NOW", "SCHEDULE"]).default("NOW"),
  scheduledAt: z.string().optional(),
  platforms: z.array(z.enum(["instagram", "facebook"])).default(["instagram"]),
  facebookCaption: z.string().max(2200).optional()
});

function isImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

function isVideo(file: File) {
  return ["video/mp4", "video/quicktime"].includes(file.type);
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const parsed = schema.safeParse({
    caption: formData.get("caption"),
    mediaType: formData.get("mediaType"),
    publishMode: formData.get("publishMode") || "NOW",
    scheduledAt: formData.get("scheduledAt") || undefined
    , platforms: String(formData.get("platforms") || "instagram").split(",").filter((value): value is "instagram" | "facebook" => value === "instagram" || value === "facebook"),
    facebookCaption: formData.get("facebookCaption") || undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Caption atau tipe post tidak valid." }, { status: 400 });
  }

  const files = formData.getAll("media").filter((item): item is File => item instanceof File && item.size > 0);
  const facebookMedia = formData.get("facebookMedia");
  const { caption, mediaType, publishMode, platforms, facebookCaption } = parsed.data;
  if (!platforms.length) return NextResponse.json({ error: "Pilih minimal satu platform." }, { status: 400 });
  const effectivePlatforms = mediaType === "IMAGE" ? platforms : platforms.filter((platform) => platform !== "facebook");
  if (!effectivePlatforms.length) return NextResponse.json({ error: "Tidak ada platform yang mendukung tipe media ini." }, { status: 400 });
  const scheduledAt =
    publishMode === "SCHEDULE" && parsed.data.scheduledAt ? convertWIBInputToUTC(parsed.data.scheduledAt) : null;

  if (publishMode === "SCHEDULE" && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) {
    return NextResponse.json({ error: "Tanggal dan jam schedule tidak valid." }, { status: 400 });
  }

  if (mediaType === "IMAGE" && files.length !== 1) {
    return NextResponse.json({ error: "Single image membutuhkan tepat 1 gambar." }, { status: 400 });
  }

  if (mediaType === "CAROUSEL" && (files.length < 2 || files.length > 10)) {
    return NextResponse.json({ error: "Carousel membutuhkan 2 sampai 10 gambar." }, { status: 400 });
  }

  if (mediaType === "REELS" && files.length !== 1) {
    return NextResponse.json({ error: "Reels membutuhkan tepat 1 video." }, { status: 400 });
  }

  const invalidFile = files.find((file) => {
    if (mediaType === "REELS") return !isVideo(file) || file.size > MAX_VIDEO_SIZE;
    return !isImage(file) || file.size > MAX_IMAGE_SIZE;
  });

  if (invalidFile) {
    const message =
      mediaType === "REELS"
        ? "Gunakan video MP4 atau MOV maksimal 100MB."
        : "Gunakan JPG, PNG, atau WebP maksimal 8MB.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await connectDB();
  const post = await Post.create({
    caption,
    baseCaption: caption,
    platforms: effectivePlatforms,
    platformOverrides: facebookCaption && facebookCaption !== caption ? [{ platform: "facebook", caption: facebookCaption }] : [],
    mediaType,
    status: publishMode === "SCHEDULE" ? "SCHEDULED" : "PUBLISHING",
    scheduledAt,
    mediaAssets: []
  });

  try {
    if (!blobToken) {
      throw new Error("BLOB_READ_WRITE_TOKEN belum dikonfigurasi. Isi .env lalu restart server development.");
    }

    await Promise.all(
      files.map(async (file, index) => {
        const blob = await put(`instagram/${post._id.toString()}/${index}-${sanitizeFileName(file.name)}`, file, {
          access: "public",
          addRandomSuffix: true,
          token: blobToken
        });

          post.mediaAssets.push({
          url: blob.url,
          order: index,
          type: mediaType === "REELS" ? "VIDEO" : "IMAGE"
        });

        return { url: blob.url, order: index };
      })
    );
    post.baseMedia = post.mediaAssets;
    if (facebookMedia instanceof File && facebookMedia.size > 0 && effectivePlatforms.includes("facebook")) {
      if (!isImage(facebookMedia) || facebookMedia.size > MAX_IMAGE_SIZE) throw new Error("Media khusus Facebook harus JPG, PNG, atau WebP maksimal 8MB.");
      const blob = await put(`facebook/${post._id.toString()}/${sanitizeFileName(facebookMedia.name)}`, facebookMedia, { access: "public", addRandomSuffix: true, token: blobToken });
      (post as any).platformOverrides = [{ platform: "facebook", caption: facebookCaption && facebookCaption !== caption ? facebookCaption : undefined, media: [{ url: blob.url, order: 0, type: "IMAGE" }] }];
      await post.save();
    }
    await post.save();

    if (publishMode === "SCHEDULE") {
      return NextResponse.json({ postId: post._id.toString(), mediaType, scheduledAt });
    }

    const { published } = await publishPostWithRetry(post._id.toString(), 1);
    return NextResponse.json({ postId: post._id.toString(), igMediaId: published.id, mediaType });
  } catch (error) {
    const message = getErrorMessage(error);
    await Post.findByIdAndUpdate(post._id, { status: "FAILED", errorMessage: message });
    await PublishLog.create({
      postId: post._id,
      action: "publish_post",
      request: { postId: post._id.toString(), mediaType },
      response: { error: message },
      status: "failed"
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
