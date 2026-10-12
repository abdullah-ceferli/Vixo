import { fileTypeFromFile } from "file-type";
import { rm } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enqueueTranscode } from "@/lib/queue";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const upload = await prisma.uploadSession.findUnique({ where: { id }, include: { video: true } });
    if (!upload || upload.userId !== user.id) throw new HttpError(404, "Upload session not found");
    if (upload.receivedBytes !== upload.expectedBytes) throw new HttpError(409, "Upload is incomplete");
    if (!["CREATED", "UPLOADING"].includes(upload.status)) throw new HttpError(409, "Upload is already finalized");
    const detected = await fileTypeFromFile(upload.temporaryPath);
    if (!detected?.mime.startsWith("video/")) {
      await prisma.$transaction([
        prisma.uploadSession.update({ where: { id }, data: { status: "FAILED" } }),
        prisma.video.update({ where: { id: upload.videoId }, data: { status: "FAILED", errorMessage: "The uploaded file is not a supported video" } }),
      ]);
      await rm(upload.temporaryPath, { force: true });
      throw new HttpError(415, "File signature is not a supported video");
    }
    const jobRecord = await prisma.$transaction(async (tx) => {
      await tx.uploadSession.update({ where: { id }, data: { status: "COMPLETE" } });
      await tx.video.update({ where: { id: upload.videoId }, data: { status: "PROCESSING", processingProgress: 1, sourcePath: upload.temporaryPath } });
      return tx.processingJob.create({ data: { videoId: upload.videoId, status: "QUEUED" } });
    });
    try {
      const queueJob = await enqueueTranscode({ videoId: upload.videoId, sourcePath: upload.temporaryPath });
      await prisma.processingJob.update({ where: { id: jobRecord.id }, data: { queueJobId: queueJob.id } });
    } catch (error) {
      await prisma.$transaction([
        prisma.processingJob.update({ where: { id: jobRecord.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Queue unavailable" } }),
        prisma.video.update({ where: { id: upload.videoId }, data: { status: "FAILED", errorMessage: "Could not queue video processing", sourcePath: null } }),
      ]);
      await rm(upload.temporaryPath, { force: true });
      throw error;
    }
    return NextResponse.json({ videoId: upload.videoId, status: "PROCESSING" });
  } catch (error) { return jsonError(error); }
}
