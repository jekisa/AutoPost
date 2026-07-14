import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const publishLogSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", default: null },
    action: { type: String, required: true },
    request: { type: Schema.Types.Mixed, default: null },
    response: { type: Schema.Types.Mixed, default: null },
    status: { type: String, enum: ["success", "failed"], required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

publishLogSchema.index({ postId: 1 });

export type PublishLogDocument = InferSchemaType<typeof publishLogSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const PublishLog =
  (mongoose.models.PublishLog as Model<PublishLogDocument>) ||
  mongoose.model<PublishLogDocument>("PublishLog", publishLogSchema);
