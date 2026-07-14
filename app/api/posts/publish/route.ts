import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getErrorMessage, publishPostWithRetry } from "@/lib/posts/publisher";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

const schema = z.object({
  caption: z.string().min(1).max(2200),
  mediaType: z.enum(["IMAGE", "CAROUSEL", "REELS"]),
  publishMode: z.enum(["NOW", "SCHEDULE"]).default("NOW"),
  scheduledAt: z.string().optional()
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
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Caption atau tipe post tidak valid." }, { status: 400 });
  }

  const files = formData.getAll("media").filter((item): item is File => item instanceof File && item.size > 0);
  const { caption, mediaType, publishMode } = parsed.data;
  const scheduledAt =
    publishMode === "SCHEDULE" && parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;

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

  const post = await prisma.post.create({
    data: {
      caption,
      mediaType,
      status: publishMode === "SCHEDULE" ? "SCHEDULED" : "PUBLISHING",
      scheduledAt
    }
  });

  try {
    await Promise.all(
      files.map(async (file, index) => {
        const blob = await put(`instagram/${post.id}/${index}-${sanitizeFileName(file.name)}`, file, {
          access: "public",
          addRandomSuffix: true
        });

        await prisma.mediaAsset.create({
          data: {
            postId: post.id,
            url: blob.url,
            order: index,
            type: mediaType === "REELS" ? "VIDEO" : "IMAGE"
          }
        });

        return { url: blob.url, order: index };
      })
    );

    if (publishMode === "SCHEDULE") {
      return NextResponse.json({ postId: post.id, mediaType, scheduledAt });
    }

    const { published } = await publishPostWithRetry(post.id, 1);
    return NextResponse.json({ postId: post.id, igMediaId: published.id, mediaType });
  } catch (error) {
    const message = getErrorMessage(error);
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "FAILED", errorMessage: message }
    });
    await prisma.publishLog.create({
      data: {
        postId: post.id,
        action: "publish_post",
        request: { postId: post.id, mediaType },
        response: { error: message },
        status: "failed"
      }
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
