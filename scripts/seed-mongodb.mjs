import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import mongoose from "mongoose";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required. Add it to .env or pass it before running npm run seed.");
}

const assetTypes = ["IMAGE", "VIDEO"];
const postMediaTypes = ["IMAGE", "CAROUSEL", "REELS"];
const postStatuses = ["DRAFT", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED"];

const mediaAssetSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    order: { type: Number, required: true },
    type: { type: String, enum: assetTypes, required: true }
  },
  { _id: true, timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    caption: { type: String, required: true },
    mediaType: { type: String, enum: postMediaTypes, required: true },
    status: { type: String, enum: postStatuses, default: "DRAFT", required: true },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    igMediaId: { type: String, default: null },
    instagramPermalink: { type: String, default: null },
    errorMessage: { type: String, default: null },
    mediaAssets: { type: [mediaAssetSchema], default: [] },
    seedKey: { type: String, index: true }
  },
  { timestamps: true }
);

const publishLogSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
    action: { type: String, required: true },
    request: { type: mongoose.Schema.Types.Mixed, default: null },
    response: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ["success", "failed"], required: true },
    seedKey: { type: String, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Post = mongoose.models.Post || mongoose.model("Post", postSchema);
const PublishLog = mongoose.models.PublishLog || mongoose.model("PublishLog", publishLogSchema);

const seedKey = "demo-seed-v1";
const now = new Date();
const publicImage = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop";
const publicImageAlt = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop";
const publicVideo = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

await mongoose.connect(MONGODB_URI);

const existingSeedPosts = await Post.find({ seedKey }).select("_id");
const existingSeedPostIds = existingSeedPosts.map((post) => post._id);

await PublishLog.deleteMany({
  $or: [{ seedKey }, { postId: { $in: existingSeedPostIds } }]
});
await Post.deleteMany({ seedKey });

const posts = await Post.insertMany([
  {
    seedKey,
    caption: "Demo scheduled image post dari seed MongoDB.",
    mediaType: "IMAGE",
    status: "SCHEDULED",
    scheduledAt: new Date(now.getTime() + 30 * 60 * 1000),
    mediaAssets: [{ url: publicImage, order: 0, type: "IMAGE" }]
  },
  {
    seedKey,
    caption: "Demo carousel post dengan dua gambar untuk preview dashboard.",
    mediaType: "CAROUSEL",
    status: "DRAFT",
    mediaAssets: [
      { url: publicImage, order: 0, type: "IMAGE" },
      { url: publicImageAlt, order: 1, type: "IMAGE" }
    ]
  },
  {
    seedKey,
    caption: "Demo published post dengan link live placeholder.",
    mediaType: "IMAGE",
    status: "PUBLISHED",
    publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    igMediaId: "demo_ig_media_id",
    instagramPermalink: "https://www.instagram.com/",
    mediaAssets: [{ url: publicImageAlt, order: 0, type: "IMAGE" }]
  },
  {
    seedKey,
    caption: "Demo failed Reels post untuk mencoba tampilan retry.",
    mediaType: "REELS",
    status: "FAILED",
    errorMessage: "Demo error: token Meta belum dikonfigurasi.",
    mediaAssets: [{ url: publicVideo, order: 0, type: "VIDEO" }]
  }
]);

await PublishLog.insertMany([
  {
    seedKey,
    postId: posts[2]._id,
    action: "seed_published_post",
    request: { source: "scripts/seed-mongodb.mjs" },
    response: { ok: true },
    status: "success"
  },
  {
    seedKey,
    postId: posts[3]._id,
    action: "seed_failed_post",
    request: { source: "scripts/seed-mongodb.mjs" },
    response: { error: "Demo error: token Meta belum dikonfigurasi." },
    status: "failed"
  }
]);

console.log(`Seeded ${posts.length} demo posts into MongoDB.`);

await mongoose.disconnect();
