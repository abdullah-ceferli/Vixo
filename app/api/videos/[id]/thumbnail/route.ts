import { fileTypeFromBuffer } from "file-type";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { storage } from "@/lib/storage";

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const video = await prisma.video.findUnique({ where: { id }, include: { channel: { select: { ownerId: true } } } });
    if (!video || video.channel.ownerId !== user.id) throw new HttpError(404, "Video not found");
    const length = Number(request.headers.get("content-length"));
    if (!Number.isFinite(length) || length <= 0 || length > MAX_THUMBNAIL_BYTES) throw new HttpError(413, "Thumbnail must be 5 MB or smaller");
    const buffer = Buffer.from(await request.arrayBuffer());
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !["image/jpeg", "image/png", "image/webp"].includes(detected.mime)) throw new HttpError(415, "Use a JPG, PNG, or WebP thumbnail");
    const fileName = `custom-thumbnail.${detected.ext}`;
    await storage.put(`videos/${id}/${fileName}`, buffer, detected.mime);
    const thumbnailUrl = `/api/media/${id}/${fileName}`;
    await prisma.video.update({ where: { id }, data: { thumbnailUrl } });
    return NextResponse.json({ thumbnailUrl });
  } catch (error) { return jsonError(error); }
}
