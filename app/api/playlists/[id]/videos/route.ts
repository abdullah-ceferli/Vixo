import { z } from "zod";
import { NextResponse } from "next/server";
import { canViewVideo } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id: playlistId } = await context.params;
    const { videoId } = await parseJson(request, z.object({ videoId: z.string().cuid() }));
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist || playlist.userId !== user.id) throw new HttpError(404, "Playlist not found");
    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { status: true, visibility: true, channel: { select: { ownerId: true } } } });
    if (!canViewVideo(video, user.id)) throw new HttpError(404, "Video not found");
    const position = await prisma.playlistVideo.count({ where: { playlistId } });
    await prisma.playlistVideo.upsert({ where: { playlistId_videoId: { playlistId, videoId } }, create: { playlistId, videoId, position }, update: {} });
    return NextResponse.json({ ok: true });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id: playlistId } = await context.params;
    const { videoId } = await parseJson(request, z.object({ videoId: z.string().cuid() }));
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist || playlist.userId !== user.id) throw new HttpError(404, "Playlist not found");
    await prisma.playlistVideo.deleteMany({ where: { playlistId, videoId } });
    return NextResponse.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
