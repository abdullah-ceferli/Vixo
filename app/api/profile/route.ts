import { z } from "zod";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";

const schema = z.object({ username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_]+$/), avatarUrl: z.union([z.string().url().max(1024).refine((value) => /^https?:\/\//i.test(value), "Use an http(s) URL"), z.literal("")]).optional() });
export async function PATCH(request: Request) {
  try { assertSameOrigin(request); const user = await requireUser(); const input = await parseJson(request, schema); const updated = await prisma.user.update({ where: { id: user.id }, data: { username: input.username, avatarUrl: input.avatarUrl || null } }); return NextResponse.json({ user: { username: updated.username, avatarUrl: updated.avatarUrl } }); }
  catch (error) { return jsonError(error); }
}
