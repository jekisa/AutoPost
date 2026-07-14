import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { mediaAssetSchema } from "@/models/MediaAsset";

export const POST_MEDIA_TYPES = ["IMAGE", "CAROUSEL", "REELS"] as const;
export const POST_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED"] as const;

const postSchema = new Schema(
  {
    caption: { type: String, required: true },
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

export const Post =
  (mongoose.models.Post as Model<PostDocument>) || mongoose.model<PostDocument>("Post", postSchema);
