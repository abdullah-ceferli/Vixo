import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, clientIp, rateLimit } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await rateLimit(`login:${clientIp(request)}`, 12, 900);
    const input = await parseJson(request, loginSchema);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) { return jsonError(error); }
}
