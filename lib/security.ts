import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { redis } from "@/lib/redis";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const originUrl = new URL(origin);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || request.headers.get("host") || new URL(request.url).host;
  const allowed = new Set([requestHost, new URL(env.NEXT_PUBLIC_APP_URL).host]);
  if (!allowed.has(originUrl.host)) {
    throw new HttpError(403, "Cross-origin request blocked");
  }
}

const localLimits = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(key: string, limit: number, seconds: number) {
  const redisKey = `rate:${key}`;
  try {
    if (redis.status === "wait") await redis.connect();
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, seconds);
    if (count > limit) throw new HttpError(429, "Too many requests. Please try again shortly.");
    return;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    const now = Date.now();
    const current = localLimits.get(key);
    const entry = !current || current.resetAt <= now ? { count: 1, resetAt: now + seconds * 1000 } : { ...current, count: current.count + 1 };
    localLimits.set(key, entry);
    if (entry.count > limit) throw new HttpError(429, "Too many requests. Please try again shortly.");
  }
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function anonymousViewerHash(request: Request) {
  return createHash("sha256").update(`${clientIp(request)}:${request.headers.get("user-agent") ?? ""}`).digest("hex");
}

export function safeStorageKey(value: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) || value.includes("..") || value.includes("\\")) {
    throw new HttpError(400, "Invalid storage path");
  }
  return value;
}
