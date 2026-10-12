import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Comments } from "@/components/comments";
import { EngagementBar } from "@/components/engagement-bar";
import { VideoCard } from "@/components/video-card";
import { VideoPlayer } from "@/components/video-player";
import { getCurrentUser } from "@/lib/auth";
import { formatCount } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const video = await prisma.video.findUnique({ where: { id }, select: { title: true } }); return { title: video?.title ?? "Video" }; }

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const user = await getCurrentUser();
  const video = await prisma.video.findUnique({ where: { id }, include: { channel: { include: { _count: { select: { subscribers: true } } } }, likes: true, comments: { where: { parentId: null }, orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { username: true, avatarUrl: true } }, replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { username: true, avatarUrl: true } } } } } } } });
  if (!video || video.status !== "READY" || (video.visibility === "PRIVATE" && video.channel.ownerId !== user?.id)) notFound();
  const [related, subscription, history] = await Promise.all([
    prisma.video.findMany({ where: { id: { not: id }, status: "READY", visibility: "PUBLIC", OR: [{ category: video.category }, { channelId: video.channelId }] }, include: { channel: { select: { name: true, handle: true, avatarUrl: true } } }, orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }], take: 12 }),
    user ? prisma.subscription.findUnique({ where: { subscriberId_channelId: { subscriberId: user.id, channelId: video.channelId } } }) : null,
    user ? prisma.watchHistory.findUnique({ where: { userId_videoId: { userId: user.id, videoId: id } } }) : null,
  ]);
  const likes = video.likes.filter((item) => item.type === "LIKE").length; const dislikes = video.likes.length - likes; const ownChannel = video.channel.ownerId === user?.id;
  return <div className="watch-layout page-enter mx-auto grid max-w-[1640px] gap-7 px-0 py-0 sm:px-5 sm:py-5 xl:grid-cols-[minmax(0,1fr)_390px]">
    <div className="min-w-0"><VideoPlayer videoId={id} source={`/api/media/${id}/master.m3u8`} poster={video.thumbnailUrl} resumeAt={history?.progressSeconds} /><div className="px-4 sm:px-0"><h1 className="mt-4 text-xl font-bold leading-snug tracking-tight">{video.title}</h1><div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="flex items-center gap-3"><Link href={`/channel/${video.channel.handle}`}><Avatar name={video.channel.name} url={video.channel.avatarUrl} /></Link><div><Link href={`/channel/${video.channel.handle}`} className="font-semibold hover:underline">{video.channel.name}</Link><p className="text-xs text-muted">{formatCount(video.channel._count.subscribers)} subscribers</p></div></div><EngagementBar videoId={id} initialLikes={likes} initialDislikes={dislikes} initialReaction={(video.likes.find((item) => item.userId === user?.id)?.type as "LIKE" | "DISLIKE" | undefined) ?? null} subscribed={Boolean(subscription)} subscribers={video.channel._count.subscribers} ownChannel={ownChannel} authenticated={Boolean(user)} /></div><details className="surface-2 mt-5 rounded-xl p-4 open:pb-5"><summary className="cursor-pointer list-none text-sm font-semibold">{formatCount(video.viewCount)} views · {video.publishedAt?.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) ?? "Unlisted"}<span className="ml-2 text-muted">Show description</span></summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{video.description || "No description provided."}</p>{Array.isArray(video.tags) && <div className="mt-3 flex flex-wrap gap-2">{(video.tags as string[]).map((tag) => <span key={tag} className="text-sm text-blue-500">#{tag.replace(/\s+/g, "")}</span>)}</div>}</details><Comments videoId={id} initial={video.comments} authenticated={Boolean(user)} /></div></div>
    <aside className="space-y-3 px-4 pb-8 sm:px-0"><h2 className="mb-3 text-base font-bold">Up next</h2>{related.length ? related.map((item) => <VideoCard key={item.id} video={item} compact />) : <p className="rounded-xl surface-2 p-5 text-sm text-muted">No related videos yet.</p>}</aside>
  </div>;
}
