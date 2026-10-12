import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (redis.status === "wait") await redis.connect();
    await redis.ping();
    return NextResponse.json({ status: "ok", database: "connected", queue: "connected" });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
