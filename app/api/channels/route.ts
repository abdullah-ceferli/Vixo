import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { HttpError, jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { channelSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    if (user.channel) throw new HttpError(409, "You already have a channel");
    const input = await parseJson(request, channelSchema);
    const channel = await prisma.channel.create({ data: { ...input, ownerId: user.id } });
    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    if (!user.channel) throw new HttpError(404, "Channel not found");
    const input = await parseJson(request, channelSchema);
    const channel = await prisma.channel.update({ where: { id: user.channel.id }, data: input });
    return NextResponse.json({ channel });
  } catch (error) { return jsonError(error); }
}
