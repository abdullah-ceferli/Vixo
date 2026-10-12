import path from "node:path";
import { mkdir } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { HttpError, jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { uploadCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    if (!user.channel) throw new HttpError(409, "Create a channel before uploading");
    const input = await parseJson(request, uploadCreateSchema);
    if (input.fileSize > env.MAX_UPLOAD_BYTES) throw new HttpError(413, `Maximum upload size is ${Math.floor(env.MAX_UPLOAD_BYTES / 1024 ** 3)} GB`);
    const allowed = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/x-msvideo"]);
    if (!allowed.has(input.mimeType)) throw new HttpError(415, "Unsupported video type");
    const tempRoot = path.resolve("tmp/uploads");
    await mkdir(tempRoot, { recursive: true });
    const result = await prisma.$transaction(async (tx) => {
      const video = await tx.video.create({ data: { channelId: user.channel!.id, title: input.title, description: input.description, category: input.category, tags: input.tags, visibility: input.visibility, status: "UPLOADING" } });
      const temporaryPath = path.join(tempRoot, `${video.id}.upload`);
      const upload = await tx.uploadSession.create({ data: { userId: user.id, videoId: video.id, originalName: path.basename(input.fileName), expectedBytes: BigInt(input.fileSize), mimeType: input.mimeType, temporaryPath, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
      return { video, upload };
    });
    return NextResponse.json({ uploadId: result.upload.id, videoId: result.video.id, chunkSize: env.UPLOAD_CHUNK_BYTES }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
