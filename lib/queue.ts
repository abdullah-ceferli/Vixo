import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export type TranscodeJob = { videoId: string; sourcePath: string };

const globalForQueue = globalThis as unknown as { transcodeQueue?: Queue<TranscodeJob> };

function getTranscodeQueue() {
  const queue = globalForQueue.transcodeQueue ?? new Queue<TranscodeJob>("video-transcode", { connection: redis });
  if (process.env.NODE_ENV !== "production") globalForQueue.transcodeQueue = queue;
  return queue;
}

export async function enqueueTranscode(data: TranscodeJob) {
  return getTranscodeQueue().add("transcode", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}
