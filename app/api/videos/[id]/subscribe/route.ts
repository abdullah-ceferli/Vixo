import { NextResponse } from "next/server";
import { canViewVideo } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id: videoId } = await context.params;
    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { channelId: true, status: true, visibility: true, channel: { select: { ownerId: true } } } });
    if (!video || !canViewVideo(video, user.id)) throw new HttpError(404, "Video not found");
    if (video.channel.ownerId === user.id) throw new HttpError(400, "You cannot subscribe to your own channel");
    const key = { subscriberId_channelId: { subscriberId: user.id, channelId: video.channelId } };
    const current = await prisma.subscription.findUnique({ where: key });
    if (current) await prisma.subscription.delete({ where: key });
    else await prisma.subscription.create({ data: { subscriberId: user.id, channelId: video.channelId } });
    const subscribers = await prisma.subscription.count({ where: { channelId: video.channelId } });
    return NextResponse.json({ subscribed: !current, subscribers });
  } catch (error) { return jsonError(error); }
}
