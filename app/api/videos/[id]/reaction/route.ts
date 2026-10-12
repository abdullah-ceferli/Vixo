import { NextResponse } from "next/server";
import { canViewVideo } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { reactionSchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id: videoId } = await context.params;
    const input = await parseJson(request, reactionSchema);
    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true, status: true, visibility: true, channel: { select: { ownerId: true } } } });
    if (!canViewVideo(video, user.id)) throw new HttpError(404, "Video not found");
    const current = await prisma.videoLike.findUnique({ where: { userId_videoId: { userId: user.id, videoId } } });
    if (current?.type === input.type) await prisma.videoLike.delete({ where: { userId_videoId: { userId: user.id, videoId } } });
    else await prisma.videoLike.upsert({ where: { userId_videoId: { userId: user.id, videoId } }, create: { userId: user.id, videoId, type: input.type }, update: { type: input.type } });
    const [likes, dislikes] = await Promise.all([
      prisma.videoLike.count({ where: { videoId, type: "LIKE" } }),
      prisma.videoLike.count({ where: { videoId, type: "DISLIKE" } }),
    ]);
    return NextResponse.json({ reaction: current?.type === input.type ? null : input.type, likes, dislikes });
  } catch (error) { return jsonError(error); }
}
