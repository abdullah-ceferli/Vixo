import { spawn } from "node:child_process";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Worker } from "bullmq";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { storage } from "../lib/storage";
import { createMasterPlaylist, selectRenditions } from "../lib/video";
import type { TranscodeJob } from "../lib/queue";

type ProbeResult = { streams: Array<{ codec_type: string; width?: number; height?: number; duration?: string }>; format: { duration?: string } };

function run(binary: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk.toString()}`.slice(-20_000); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(`${path.basename(binary)} exited with code ${code}: ${stderr}`)));
  });
}

async function filesBelow(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const result: string[] = [];
  for (const entry of entries) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) result.push(...(await filesBelow(root, full)));
    else result.push(full);
  }
  return result;
}

async function processVideo(videoId: string, sourcePath: string) {
  const outputRoot = path.resolve("tmp/processed", videoId);
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  const jobRecord = await prisma.processingJob.findFirst({ where: { videoId }, orderBy: { createdAt: "desc" } });
  await prisma.$transaction([
    prisma.video.update({ where: { id: videoId }, data: { status: "PROCESSING", processingProgress: 3, errorMessage: null } }),
    ...(jobRecord ? [prisma.processingJob.update({ where: { id: jobRecord.id }, data: { status: "ACTIVE", startedAt: new Date(), attempts: { increment: 1 } } })] : []),
  ]);
  try {
    const rawProbe = await run(env.FFPROBE_PATH, ["-v", "error", "-show_streams", "-show_format", "-of", "json", sourcePath]);
    const probe = JSON.parse(rawProbe) as ProbeResult;
    const stream = probe.streams.find((item) => item.codec_type === "video");
    if (!stream?.width || !stream.height) throw new Error("No valid video stream found");
    const duration = Math.max(1, Math.round(Number(probe.format.duration || stream.duration || 0)));
    const profiles = selectRenditions(stream.width, stream.height);
    await prisma.video.update({ where: { id: videoId }, data: { sourceWidth: stream.width, sourceHeight: stream.height, duration, processingProgress: 7 } });
    const renditionData: Array<{ resolution: number; width: number; height: number; codec: string; bitrate: number; storagePath: string; fileSize: bigint }> = [];
    for (let index = 0; index < profiles.length; index += 1) {
      const profile = profiles[index];
      const target = path.join(outputRoot, `${profile.height}p`);
      await mkdir(target, { recursive: true });
      const keyframes = env.HLS_SEGMENT_SECONDS * 30;
      await run(env.FFMPEG_PATH, [
        "-y", "-i", sourcePath,
        "-map", "0:v:0", "-map", "0:a:0?",
        "-vf", `scale=${profile.width}:${profile.height}:flags=lanczos`,
        "-c:v", "libx264", "-preset", env.VIDEO_PRESET, "-crf", String(env.VIDEO_CRF),
        "-profile:v", "high", "-level", "4.2", "-pix_fmt", "yuv420p",
        "-b:v", String(profile.videoBitrate), "-maxrate", String(profile.maxRate), "-bufsize", String(profile.bufferSize),
        "-g", String(keyframes), "-keyint_min", String(keyframes), "-sc_threshold", "0", "-force_key_frames", `expr:gte(t,n_forced*${env.HLS_SEGMENT_SECONDS})`,
        "-c:a", "aac", "-b:a", String(profile.audioBitrate), "-ac", "2", "-ar", "48000",
        "-hls_time", String(env.HLS_SEGMENT_SECONDS), "-hls_playlist_type", "vod", "-hls_flags", "independent_segments+temp_file",
        "-hls_segment_filename", path.join(target, "segment_%05d.ts"), path.join(target, "index.m3u8"),
      ]);
      const renditionFiles = await filesBelow(target);
      let fileSize = 0n;
      for (const file of renditionFiles) fileSize += BigInt((await stat(file)).size);
      renditionData.push({ resolution: profile.height, width: profile.width, height: profile.height, codec: "h264/aac", bitrate: profile.videoBitrate + profile.audioBitrate, storagePath: `videos/${videoId}/${profile.height}p/index.m3u8`, fileSize });
      await prisma.video.update({ where: { id: videoId }, data: { processingProgress: 7 + Math.round(((index + 1) / profiles.length) * 75) } });
    }
    const masterPath = path.join(outputRoot, "master.m3u8");
    await writeFile(masterPath, createMasterPlaylist(profiles), "utf8");
    const thumbnailPath = path.join(outputRoot, "thumbnail.jpg");
    await run(env.FFMPEG_PATH, ["-y", "-ss", String(Math.min(5, Math.max(0, duration * 0.1))), "-i", sourcePath, "-frames:v", "1", "-vf", "scale=1280:-2", "-q:v", "3", thumbnailPath]);
    const files = await filesBelow(outputRoot);
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const relative = path.relative(outputRoot, file).split(path.sep).join("/");
      const contentType = relative.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : relative.endsWith(".ts") ? "video/mp2t" : relative.endsWith(".jpg") ? "image/jpeg" : undefined;
      await storage.put(`videos/${videoId}/${relative}`, file, contentType);
      await prisma.video.update({ where: { id: videoId }, data: { processingProgress: 82 + Math.round(((index + 1) / files.length) * 15) } });
    }
    const verified = await Promise.all([storage.exists(`videos/${videoId}/master.m3u8`), storage.exists(`videos/${videoId}/thumbnail.jpg`), ...profiles.map((profile) => storage.exists(`videos/${videoId}/${profile.height}p/index.m3u8`))]);
    if (verified.some((value) => !value)) throw new Error("Processed media verification failed");
    await prisma.$transaction(async (tx) => {
      const readyVideo = await tx.video.findUniqueOrThrow({ where: { id: videoId }, select: { title: true, visibility: true, channelId: true } });
      await tx.videoRendition.deleteMany({ where: { videoId } });
      await tx.videoRendition.createMany({ data: renditionData.map((item) => ({ ...item, videoId })) });
      await tx.video.update({ where: { id: videoId }, data: { status: "READY", processingProgress: 100, masterPlaylistPath: `videos/${videoId}/master.m3u8`, thumbnailUrl: `/api/media/${videoId}/thumbnail.jpg`, publishedAt: readyVideo.visibility === "PUBLIC" ? new Date() : null } });
      if (jobRecord) await tx.processingJob.update({ where: { id: jobRecord.id }, data: { status: "COMPLETE", completedAt: new Date(), error: null } });
      const channel = await tx.channel.findFirstOrThrow({ where: { videos: { some: { id: videoId } } }, select: { ownerId: true } });
      await tx.notification.create({ data: { userId: channel.ownerId, type: "VIDEO_READY", title: "Your video is ready", body: "Processing is complete and your video can now be played.", href: `/watch/${videoId}` } });
      if (readyVideo.visibility === "PUBLIC") {
        const subscribers = await tx.subscription.findMany({ where: { channelId: readyVideo.channelId }, select: { subscriberId: true } });
        if (subscribers.length) await tx.notification.createMany({ data: subscribers.map(({ subscriberId }) => ({ userId: subscriberId, type: "SUBSCRIPTION" as const, title: "New video", body: readyVideo.title, href: `/watch/${videoId}` })) });
      }
    });
    if (env.DELETE_SOURCE_AFTER_TRANSCODE === "true") {
      await rm(sourcePath, { force: true });
      await prisma.video.update({ where: { id: videoId }, data: { sourcePath: null } });
    }
    await rm(outputRoot, { recursive: true, force: true });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 4000) : "Video processing failed";
    await prisma.$transaction([
      prisma.video.update({ where: { id: videoId }, data: { status: "FAILED", errorMessage: message } }),
      ...(jobRecord ? [prisma.processingJob.update({ where: { id: jobRecord.id }, data: { status: "FAILED", error: message } })] : []),
    ]);
    throw error;
  }
}

const worker = new Worker<TranscodeJob>("video-transcode", async (job) => processVideo(job.data.videoId, job.data.sourcePath), {
  connection: redis,
  concurrency: env.WORKER_CONCURRENCY,
  lockDuration: 30 * 60 * 1000,
});

worker.on("ready", () => console.log("Vixo transcoding worker is ready"));
worker.on("completed", (job) => console.log(`Transcoding completed for ${job.data.videoId}`));
worker.on("failed", (job, error) => console.error(`Transcoding failed for ${job?.data.videoId}:`, error));

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
