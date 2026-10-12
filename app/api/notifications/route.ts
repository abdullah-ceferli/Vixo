import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";

export async function PATCH(request: Request) {
  try { assertSameOrigin(request); const user = await requireUser(); await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } }); return NextResponse.json({ ok: true }); }
  catch (error) { return jsonError(error); }
}
