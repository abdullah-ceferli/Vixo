import { NextResponse } from "next/server";
import { canViewVideo } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { HttpError, jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { anonymousViewerHash, assertSameOrigin } from "@/lib/security";
import { progressSchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    const { id: videoId } = await context.params;
    const input = await parseJson(request, progressSchema);
    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { duration: true, status: true, visibility: true, channel: { select: { ownerId: true } } } });
    if (!video || !canViewVideo(video, user?.id)) throw new HttpError(404, "Video not found");
    if (user) await prisma.watchHistory.upsert({ where: { userId_videoId: { userId: user.id, videoId } }, create: { userId: user.id, videoId, progressSeconds: Math.min(input.seconds, video.duration), completed: input.completed }, update: { progressSeconds: Math.min(input.seconds, video.duration), completed: input.completed } });
    return NextResponse.json({ ok: true });
  } catch (error) { return jsonError(error); }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    const { id: videoId } = await context.params;
    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { status: true, visibility: true, channel: { select: { ownerId: true } } } });
    if (!video || !canViewVideo(video, user?.id)) throw new HttpError(404, "Video not found");
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const ipHash = anonymousViewerHash(request);
    const exists = await prisma.videoView.findFirst({ where: { videoId, ipHash, viewedAt: { gte: since } } });
    if (!exists) await prisma.$transaction([
      prisma.videoView.create({ data: { videoId, userId: user?.id, ipHash } }),
      prisma.video.update({ where: { id: videoId }, data: { viewCount: { increment: 1 } } }),
    ]);
    return NextResponse.json({ counted: !exists });
  } catch (error) { return jsonError(error); }
}
