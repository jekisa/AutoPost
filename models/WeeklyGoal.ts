import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const weeklyGoalSchema = new Schema({ targetPostsPerWeek: { type: Number, required: true, min: 1, max: 100 } }, { timestamps: true });

export type WeeklyGoalDocument = InferSchemaType<typeof weeklyGoalSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date };
export const WeeklyGoal = (mongoose.models.WeeklyGoal as Model<WeeklyGoalDocument>) || mongoose.model<WeeklyGoalDocument>("WeeklyGoal", weeklyGoalSchema);
