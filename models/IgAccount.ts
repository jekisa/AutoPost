import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { encryptSecret } from "@/lib/crypto";

const encryptedSecretPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const igAccountSchema = new Schema(
  {
    igUserId: { type: String, required: true, unique: true },
    pageId: { type: String, required: true },
    username: { type: String, default: null },
    accessToken: { type: String, required: true },
    tokenExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

igAccountSchema.pre("save", function encryptAccessToken() {
  if (this.isModified("accessToken") && !encryptedSecretPattern.test(this.accessToken)) {
    this.accessToken = encryptSecret(this.accessToken);
  }
});

igAccountSchema.pre("findOneAndUpdate", function encryptUpdatedAccessToken() {
  const update = this.getUpdate();
  if (!update || Array.isArray(update)) return;

  const accessToken =
    "accessToken" in update
      ? update.accessToken
      : "$set" in update && update.$set && typeof update.$set === "object"
        ? (update.$set as { accessToken?: unknown }).accessToken
        : undefined;

  if (typeof accessToken === "string" && !encryptedSecretPattern.test(accessToken)) {
    if ("accessToken" in update) {
      update.accessToken = encryptSecret(accessToken);
    } else if ("$set" in update && update.$set && typeof update.$set === "object") {
      (update.$set as { accessToken: string }).accessToken = encryptSecret(accessToken);
    }
  }

});

export type IgAccountDocument = InferSchemaType<typeof igAccountSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const IgAccount =
  (mongoose.models.IgAccount as Model<IgAccountDocument>) ||
  mongoose.model<IgAccountDocument>("IgAccount", igAccountSchema);
