import { createWriteStream } from "node:fs";
import { mkdir, stat, truncate } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { HttpError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const upload = await prisma.uploadSession.findUnique({ where: { id } });
    if (!upload || upload.userId !== user.id) throw new HttpError(404, "Upload session not found");
    if (!["CREATED", "UPLOADING"].includes(upload.status)) throw new HttpError(409, "Upload is not writable");
    const offset = Number(request.headers.get("upload-offset"));
    const contentLength = Number(request.headers.get("upload-length") || request.headers.get("content-length"));
    if (!Number.isSafeInteger(offset) || offset !== Number(upload.receivedBytes)) throw new HttpError(409, `Expected byte offset ${upload.receivedBytes}`);
    if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > env.UPLOAD_CHUNK_BYTES) throw new HttpError(413, "Invalid chunk size");
    if (BigInt(offset + contentLength) > upload.expectedBytes) throw new HttpError(413, "Chunk exceeds declared file size");
    if (!request.body) throw new HttpError(400, "Chunk body is required");
    await mkdir(path.dirname(upload.temporaryPath), { recursive: true });
    const existing = await stat(upload.temporaryPath).catch(() => null);
    if ((existing?.size ?? 0) !== offset) throw new HttpError(409, "Temporary file offset mismatch");
    await pipeline(Readable.fromWeb(request.body as never), createWriteStream(upload.temporaryPath, { flags: "a" }));
    const nextOffset = offset + contentLength;
    const written = await stat(upload.temporaryPath);
    if (written.size !== nextOffset) {
      await truncate(upload.temporaryPath, offset);
      throw new HttpError(400, "Received chunk length did not match its declaration");
    }
    await prisma.uploadSession.update({ where: { id }, data: { receivedBytes: BigInt(nextOffset), status: "UPLOADING" } });
    return NextResponse.json({ offset: nextOffset, complete: BigInt(nextOffset) === upload.expectedBytes });
  } catch (error) { return jsonError(error); }
}
