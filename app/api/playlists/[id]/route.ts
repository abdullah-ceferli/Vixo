import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { playlistSchema } from "@/lib/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const user = await requireUser(); const { id } = await context.params; const playlist = await prisma.playlist.findUnique({ where: { id } }); if (!playlist || playlist.userId !== user.id) throw new HttpError(404, "Playlist not found"); const input = await parseJson(request, playlistSchema); const updated = await prisma.playlist.update({ where: { id }, data: input }); return NextResponse.json({ playlist: updated }); }
  catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const user = await requireUser(); const { id } = await context.params; const playlist = await prisma.playlist.findUnique({ where: { id } }); if (!playlist || playlist.userId !== user.id) throw new HttpError(404, "Playlist not found"); await prisma.playlist.delete({ where: { id } }); return NextResponse.json({ ok: true }); }
  catch (error) { return jsonError(error); }
}
