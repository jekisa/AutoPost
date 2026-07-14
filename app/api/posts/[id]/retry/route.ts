import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getErrorMessage, publishPostWithRetry } from "@/lib/posts/publisher";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) return NextResponse.json({ error: "Post tidak ditemukan." }, { status: 404 });
  if (post.status !== "FAILED") {
    return NextResponse.json({ error: "Retry hanya tersedia untuk post FAILED." }, { status: 400 });
  }

  try {
    const { published, attempts } = await publishPostWithRetry(id, 1);
    return NextResponse.json({ postId: id, status: "PUBLISHED", igMediaId: published.id, attempts });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
