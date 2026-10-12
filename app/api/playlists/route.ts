import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { playlistSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUser();
    const playlists = await prisma.playlist.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: { _count: { select: { videos: true } } } });
    return NextResponse.json({ playlists });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseJson(request, playlistSchema);
    const playlist = await prisma.playlist.create({ data: { ...input, userId: user.id } });
    return NextResponse.json({ playlist }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
