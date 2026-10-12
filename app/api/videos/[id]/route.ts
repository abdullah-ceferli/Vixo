import { z } from "zod";
import { rm } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { storage } from "@/lib/storage";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(20000),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const video = await prisma.video.findUnique({ where: { id }, include: { channel: { select: { ownerId: true } }, renditions: { orderBy: { resolution: "asc" } } } });
    if (!video || video.channel.ownerId !== user.id) throw new HttpError(404, "Video not found");
    return NextResponse.json({ video: { ...video, viewCount: Number(video.viewCount), renditions: video.renditions.map((item) => ({ ...item, fileSize: Number(item.fileSize) })) } });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const input = await parseJson(request, updateSchema);
    const video = await prisma.video.findUnique({ where: { id }, include: { channel: { select: { ownerId: true } } } });
    if (!video || video.channel.ownerId !== user.id) throw new HttpError(404, "Video not found");
    const updated = await prisma.video.update({ where: { id }, data: { ...input, publishedAt: video.status === "READY" && input.visibility === "PUBLIC" && !video.publishedAt ? new Date() : video.publishedAt } });
    return NextResponse.json({ video: { ...updated, viewCount: Number(updated.viewCount) } });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const video = await prisma.video.findUnique({ where: { id }, include: { channel: { select: { ownerId: true } } } });
    if (!video || video.channel.ownerId !== user.id) throw new HttpError(404, "Video not found");
    await prisma.video.update({ where: { id }, data: { status: "DELETING" } });
    if (video.sourcePath) await rm(video.sourcePath, { force: true });
    await storage.deletePrefix(`videos/${id}/`);
    await prisma.video.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
