import { Schema, type InferSchemaType } from "mongoose";

export const ASSET_TYPES = ["IMAGE", "VIDEO"] as const;

export const mediaAssetSchema = new Schema(
  {
    url: { type: String, required: true },
    order: { type: Number, required: true },
    type: { type: String, enum: ASSET_TYPES, required: true }
  },
  { _id: true, timestamps: true }
);

export type MediaAsset = InferSchemaType<typeof mediaAssetSchema>;
