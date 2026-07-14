import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RetryPostButton } from "@/components/retry-post-button";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post";

const statusStyles = {
  DRAFT: "bg-stone-100 text-stone-700",
  SCHEDULED: "bg-sky-100 text-sky-800",
  PUBLISHING: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800"
};

const validStatuses = ["DRAFT", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED"] as const;
type PostStatus = (typeof validStatuses)[number];

export default async function Dashboard({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { status } = await searchParams;
  const selectedStatus = validStatuses.includes(status as PostStatus) ? (status as PostStatus) : undefined;
  const postsResult = await connectDB()
    .then(() => {
      return Post.find(selectedStatus ? { status: selectedStatus } : {})
        .sort({ createdAt: -1 })
        .lean();
    })
    .then((posts) => ({ posts, error: null }))
    .catch((error: unknown) => {
      console.error("Dashboard failed to load posts", error);
      return {
        posts: [],
        error: error instanceof Error ? error.message : "Database tidak bisa diakses."
      };
    });

  const { posts } = postsResult;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Post History</h1>
          <p className="mt-1 text-sm text-stone-600">Riwayat publish Instagram dan status terakhir.</p>
        </div>
        <Link className="rounded-md bg-moss px-4 py-2 text-sm font-medium text-white" href="/compose">
          New Post
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {["", "DRAFT", "PUBLISHING", "PUBLISHED", "FAILED", "SCHEDULED"].map((item) => (
          <Link
            key={item || "ALL"}
            href={item ? `/?status=${item}` : "/"}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5"
          >
            {item || "ALL"}
          </Link>
        ))}
      </div>

      {postsResult.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Dashboard gagal membaca database.</p>
          <p className="mt-1">
            Cek environment variable `MONGODB_URI` di Vercel dan pastikan database MongoDB Atlas bisa diakses dari
            deployment production.
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-4 py-3">Media</th>
              <th className="px-4 py-3">Caption</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Live Instagram</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {posts.map((post) => (
              <tr key={post._id.toString()}>
                <td className="px-4 py-3">
                  {post.mediaAssets.length ? (
                    <div className="flex items-center gap-2">
                      <div className="relative h-16 w-16 overflow-hidden rounded bg-stone-100">
                        {post.mediaAssets[0].type === "VIDEO" ? (
                          <video src={post.mediaAssets[0].url} className="h-full w-full object-cover" muted />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.mediaAssets[0].url} alt="" className="h-full w-full object-cover" />
                        )}
                        {post.mediaType === "REELS" ? (
                          <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                            REELS
                          </span>
                        ) : null}
                      </div>
                      {post.mediaType === "CAROUSEL" ? (
                        <div className="flex max-w-28 -space-x-2">
                          {post.mediaAssets.slice(1, 4).map((asset) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={asset._id.toString()}
                              src={asset.url}
                              alt=""
                              className="h-9 w-9 rounded border-2 border-white object-cover"
                            />
                          ))}
                          <span className="flex h-9 min-w-9 items-center justify-center rounded border-2 border-white bg-stone-100 px-1 text-xs">
                            {post.mediaAssets.length}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded bg-stone-100" />
                  )}
                </td>
                <td className="max-w-xl px-4 py-3">{post.caption.slice(0, 140)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusStyles[post.status]}`}>
                      {post.status}
                    </span>
                    <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium">{post.mediaType}</span>
                  </div>
                  {post.scheduledAt ? (
                    <p className="mt-1 text-xs text-stone-500">Scheduled: {post.scheduledAt.toLocaleString()}</p>
                  ) : null}
                  {post.publishedAt ? (
                    <p className="mt-1 text-xs text-stone-500">Published: {post.publishedAt.toLocaleString()}</p>
                  ) : null}
                  {post.errorMessage ? <p className="mt-1 max-w-xs text-xs text-red-700">{post.errorMessage}</p> : null}
                  {post.status === "FAILED" ? <RetryPostButton postId={post._id.toString()} /> : null}
                </td>
                <td className="px-4 py-3">
                  {post.instagramPermalink ? (
                    <a
                      href={post.instagramPermalink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-moss hover:text-moss"
                    >
                      Open Live Post
                    </a>
                  ) : post.igMediaId ? (
                    <span className="block max-w-36 truncate text-xs text-stone-500" title={post.igMediaId}>
                      ID: {post.igMediaId}
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-stone-600">{post.createdAt.toLocaleString()}</td>
              </tr>
            ))}
            {!posts.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-stone-500">
                  Belum ada post.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
