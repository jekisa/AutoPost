import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getErrorMessage, publishPostWithRetry } from "@/lib/posts/publisher";
import { Post } from "@/models/Post";
import { PublishLog } from "@/models/PublishLog";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

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

  await connectDB();
  const post = await Post.create({
    caption: parsed.data.caption,
    mediaType: "IMAGE",
    status: "PUBLISHING",
    mediaAssets: []
  });

  try {
    if (!blobToken) {
      throw new Error("BLOB_READ_WRITE_TOKEN belum dikonfigurasi. Isi .env lalu restart server development.");
    }

    const blob = await put(`instagram/${post._id.toString()}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
      token: blobToken
    });

    post.mediaAssets.push({ url: blob.url, order: 0, type: "IMAGE" });
    await post.save();

    const { published } = await publishPostWithRetry(post._id.toString(), 1);

    return NextResponse.json({ postId: post._id.toString(), igMediaId: published.id, imageUrl: blob.url });
  } catch (error) {
    const message = getErrorMessage(error);
    await Post.findByIdAndUpdate(post._id, { status: "FAILED", errorMessage: message });
    await PublishLog.create({
      postId: post._id,
      action: "publish_image",
      request: { postId: post._id.toString() },
      response: { error: message },
      status: "failed"
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
