export type ViewableVideo = { status: string; visibility: string; channel: { ownerId: string } };

export function canViewVideo(video: ViewableVideo | null, userId?: string | null) {
  if (!video || video.status !== "READY") return false;
  if (video.visibility === "PRIVATE") return video.channel.ownerId === userId;
  return video.visibility === "PUBLIC" || video.visibility === "UNLISTED";
}
