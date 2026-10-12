import sanitizeHtml from "sanitize-html";
import { NextResponse } from "next/server";
import { canViewVideo } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { commentSchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id: videoId } = await context.params;
    const input = await parseJson(request, commentSchema);
    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { status: true, visibility: true, channel: { select: { ownerId: true } } } });
    if (!canViewVideo(video, user.id)) throw new HttpError(404, "Video not found");
    if (input.parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.videoId !== videoId) throw new HttpError(400, "Invalid parent comment");
    }
    const body = sanitizeHtml(input.body, { allowedTags: [], allowedAttributes: {} });
    const comment = await prisma.comment.create({ data: { videoId, userId: user.id, parentId: input.parentId, body }, include: { user: { select: { username: true, avatarUrl: true } } } });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
