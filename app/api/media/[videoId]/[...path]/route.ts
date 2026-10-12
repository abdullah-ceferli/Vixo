import { Readable } from "node:stream";
import { canViewVideo } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { HttpError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { safeStorageKey } from "@/lib/security";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  m3u8: "application/vnd.apple.mpegurl",
  ts: "video/mp2t",
  m4s: "video/iso.segment",
  mp4: "video/mp4",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(request: Request, context: { params: Promise<{ videoId: string; path: string[] }> }) {
  try {
    const { videoId, path } = await context.params;
    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { status: true, visibility: true, channel: { select: { ownerId: true } } } });
    const user = video?.visibility === "PRIVATE" ? await getCurrentUser() : null;
    if (!video || !canViewVideo(video, user?.id)) throw new HttpError(404, "Media not found");
    const relative = safeStorageKey(path.join("/"));
    const key = `videos/${videoId}/${relative}`;
    const rangeHeader = request.headers.get("range");
    const rangeMatch = rangeHeader?.match(/^bytes=(\d+)-(\d*)$/);
    const range = rangeMatch ? { start: Number(rangeMatch[1]), end: rangeMatch[2] ? Number(rangeMatch[2]) : undefined } : undefined;
    const object = await storage.get(key, range);
    const extension = relative.split(".").pop()?.toLowerCase() ?? "";
    const headers = new Headers({
      "Content-Type": object.contentType || MIME[extension] || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": video.visibility === "PUBLIC" ? "public, max-age=31536000, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (range) {
      const end = range.end ?? object.size - 1;
      headers.set("Content-Range", `bytes ${range.start}-${end}/${object.size}`);
      headers.set("Content-Length", String(Math.max(0, end - range.start + 1)));
    } else headers.set("Content-Length", String(object.size));
    return new Response(Readable.toWeb(object.body as Readable) as ReadableStream, { status: range ? 206 : 200, headers });
  } catch (error) { return jsonError(error); }
}
