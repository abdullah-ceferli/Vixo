import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, clientIp, rateLimit } from "@/lib/security";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await rateLimit(`register:${clientIp(request)}`, 8, 3600);
    const input = await parseJson(request, registerSchema);
    const exists = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { username: input.username }] } });
    if (exists) return NextResponse.json({ error: "Email or username is already in use" }, { status: 409 });
    const user = await prisma.user.create({ data: { username: input.username, email: input.email, passwordHash: await hashPassword(input.password) } });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, username: user.username, email: user.email } }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
