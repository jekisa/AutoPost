import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { WeeklyGoal } from "@/models/WeeklyGoal";

const schema = z.object({ targetPostsPerWeek: z.coerce.number().int().min(1).max(100) });

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Target harus berupa angka 1 sampai 100." }, { status: 400 });
  await connectDB();
  const goal = await WeeklyGoal.findOneAndUpdate({}, { targetPostsPerWeek: parsed.data.targetPostsPerWeek }, { new: true, upsert: true, setDefaultsOnInsert: true });
  return NextResponse.json({ goal: { targetPostsPerWeek: goal.targetPostsPerWeek } });
}
