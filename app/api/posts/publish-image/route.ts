import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getErrorMessage, publishPostWithRetry } from "@/lib/posts/publisher";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const schema = z.object({
  caption: z.string().min(1).max(2200)
});

function isImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const parsed = schema.safeParse({ caption: formData.get("caption") });
  const file = formData.get("image");

  if (!parsed.success || !(file instanceof File)) {
    return NextResponse.json({ error: "Caption dan gambar wajib diisi." }, { status: 400 });
  }

  if (!isImage(file) || file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "Gunakan JPG, PNG, atau WebP maksimal 8MB." }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      caption: parsed.data.caption,
      mediaType: "IMAGE",
      status: "PUBLISHING"
    }
  });

  try {
    const blob = await put(`instagram/${post.id}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true
    });

    await prisma.mediaAsset.create({
      data: {
        postId: post.id,
        url: blob.url,
        order: 0,
        type: "IMAGE"
      }
    });

    const { published } = await publishPostWithRetry(post.id, 1);

    return NextResponse.json({ postId: post.id, igMediaId: published.id, imageUrl: blob.url });
  } catch (error) {
    const message = getErrorMessage(error);
    await prisma.post.update({
      where: { id: post.id },
      data: { status: "FAILED", errorMessage: message }
    });
    await prisma.publishLog.create({
      data: {
        postId: post.id,
        action: "publish_image",
        request: { postId: post.id },
        response: { error: message },
        status: "failed"
      }
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
