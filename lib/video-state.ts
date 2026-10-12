export type VideoState = "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | "DELETING";

const transitions: Record<VideoState, VideoState[]> = {
  UPLOADING: ["PROCESSING", "FAILED", "DELETING"],
  PROCESSING: ["READY", "FAILED", "DELETING"],
  READY: ["PROCESSING", "DELETING"],
  FAILED: ["PROCESSING", "DELETING"],
  DELETING: [],
};

export function canTransitionVideo(from: VideoState, to: VideoState) {
  return transitions[from].includes(to);
}
