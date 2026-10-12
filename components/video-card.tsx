import Link from "next/link";
import { Play } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { formatCount, formatDuration, relativeDate } from "@/lib/format";

type CardVideo = {
  id: string; title: string; thumbnailUrl: string | null; duration: number; viewCount: bigint | number; publishedAt: Date | null; createdAt: Date;
  channel: { name: string; handle: string; avatarUrl: string | null };
};

export function VideoCard({ video, compact = false }: { video: CardVideo; compact?: boolean }) {
  return (
    <article className={compact ? "group flex gap-3" : "group min-w-0"}>
      <Link href={`/watch/${video.id}`} className={`relative block shrink-0 overflow-hidden rounded-xl bg-zinc-900 ${compact ? "aspect-video w-[168px]" : "aspect-video w-full"}`}>
        {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]" /> : <span className="grid h-full w-full place-items-center text-zinc-500"><Play size={36} /></span>}
        {video.duration > 0 && <span className="absolute bottom-1.5 right-1.5 rounded bg-black/85 px-1.5 py-0.5 text-[11px] font-semibold text-white">{formatDuration(video.duration)}</span>}
      </Link>
      <div className={`flex min-w-0 ${compact ? "flex-1" : "mt-3 gap-3"}`}>
        {!compact && <Link href={`/channel/${video.channel.handle}`}><Avatar name={video.channel.name} url={video.channel.avatarUrl} /></Link>}
        <div className="min-w-0">
          <Link href={`/watch/${video.id}`} className={`line-clamp-2 font-semibold leading-snug ${compact ? "text-sm" : "text-[15px]"}`}>{video.title}</Link>
          <Link href={`/channel/${video.channel.handle}`} className="mt-1 block truncate text-[13px] text-muted hover:text-[var(--foreground)]">{video.channel.name}</Link>
          <p className="text-[13px] text-muted">{formatCount(video.viewCount)} views · {relativeDate(video.publishedAt ?? video.createdAt)}</p>
        </div>
      </div>
    </article>
  );
}
