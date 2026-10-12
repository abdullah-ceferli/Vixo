import { rm } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const upload = await prisma.uploadSession.findUnique({ where: { id }, include: { video: { select: { status: true, processingProgress: true, errorMessage: true } } } });
    if (!upload || upload.userId !== user.id) throw new HttpError(404, "Upload not found");
    return NextResponse.json({ status: upload.status, receivedBytes: Number(upload.receivedBytes), expectedBytes: Number(upload.expectedBytes), video: upload.video });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const upload = await prisma.uploadSession.findUnique({ where: { id } });
    if (!upload || upload.userId !== user.id) throw new HttpError(404, "Upload not found");
    if (upload.status === "COMPLETE") throw new HttpError(409, "Processing has already started");
    await rm(upload.temporaryPath, { force: true });
    await prisma.$transaction([
      prisma.uploadSession.update({ where: { id }, data: { status: "CANCELLED" } }),
      prisma.video.delete({ where: { id: upload.videoId } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
