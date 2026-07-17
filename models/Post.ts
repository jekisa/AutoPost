import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { mediaAssetSchema } from "@/models/MediaAsset";

export const POST_MEDIA_TYPES = ["IMAGE", "CAROUSEL", "REELS"] as const;
export const POST_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHING", "PUBLISHED", "PARTIAL", "FAILED"] as const;
export const POST_PLATFORMS = ["instagram", "facebook"] as const;
export const PLATFORM_RESULT_STATUSES = ["PENDING", "PUBLISHING", "PUBLISHED", "FAILED"] as const;

const platformOverrideSchema = new Schema(
  {
    platform: { type: String, enum: POST_PLATFORMS, required: true },
    caption: { type: String },
    media: { type: [mediaAssetSchema], default: undefined }
  },
  { _id: false }
);

const platformResultSchema = new Schema(
  {
    platform: { type: String, enum: POST_PLATFORMS, required: true },
    status: { type: String, enum: PLATFORM_RESULT_STATUSES, required: true, default: "PENDING" },
    externalId: { type: String },
    externalUrl: { type: String },
    errorMessage: { type: String },
    publishedAt: { type: Date }
  },
  { _id: false }
);

const postSchema = new Schema(
  {
    caption: { type: String, required: true },
    baseCaption: { type: String },
    baseMedia: { type: [mediaAssetSchema], default: undefined },
    platforms: { type: [String], enum: POST_PLATFORMS, default: ["instagram"] },
    platformOverrides: { type: [platformOverrideSchema], default: [] },
    platformResults: { type: [platformResultSchema], default: [] },
    mediaType: { type: String, enum: POST_MEDIA_TYPES, required: true },
    status: { type: String, enum: POST_STATUSES, default: "DRAFT", required: true },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    igMediaId: { type: String, default: null },
    instagramPermalink: { type: String, default: null },
    errorMessage: { type: String, default: null },
    mediaAssets: { type: [mediaAssetSchema], default: [] }
  },
  { timestamps: true }
);

postSchema.index({ status: 1, scheduledAt: 1 });
postSchema.index({ createdAt: -1 });

export type PostDocument = InferSchemaType<typeof postSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

postSchema.pre("validate", function normalizeLegacyPost() {
  const post = this as unknown as Record<string, any>;
  if (!post.baseCaption) post.baseCaption = post.caption;
  if (!post.baseMedia?.length && post.mediaAssets?.length) post.baseMedia = post.mediaAssets;
  if (!post.platforms?.length) post.platforms = ["instagram"];
  if (!post.platformResults?.length) post.platformResults = post.platforms.map((platform: string) => ({ platform, status: "PENDING" }));
});

export const Post =
  (mongoose.models.Post as Model<PostDocument>) || mongoose.model<PostDocument>("Post", postSchema);
