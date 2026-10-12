import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Eye, Upload, Users, Video } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StudioVideoTable } from "@/components/studio-video-table";
import { requireUser } from "@/lib/auth";
import { formatCount } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Creator Studio" };
export default async function StudioPage() {
  const user = await requireUser(); if (!user.channel) redirect("/studio/channel");
  const [videos, subscribers] = await Promise.all([prisma.video.findMany({ where: { channelId: user.channel.id }, orderBy: { createdAt: "desc" } }), prisma.subscription.count({ where: { channelId: user.channel.id } })]);
  const totalViews = videos.reduce((sum, item) => sum + item.viewCount, 0n);
  const serialized = videos.map((video) => ({ id: video.id, title: video.title, description: video.description, thumbnailUrl: video.thumbnailUrl, duration: video.duration, visibility: video.visibility, status: video.status, processingProgress: video.processingProgress, viewCount: Number(video.viewCount), createdAt: video.createdAt.toISOString(), errorMessage: video.errorMessage }));
  return <div className="page-enter mx-auto max-w-7xl px-5 py-8"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-red-500">Creator Studio</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Channel dashboard</h1></div><Link href="/studio/upload" className="button-primary"><Upload size={18} /> Upload</Link></div><div className="mt-7 grid gap-4 sm:grid-cols-3"><Stat icon={<Video size={20} />} label="Videos" value={String(videos.length)} /><Stat icon={<Eye size={20} />} label="Total views" value={formatCount(totalViews)} /><Stat icon={<Users size={20} />} label="Subscribers" value={formatCount(subscribers)} /></div><div className="mt-9 flex items-center gap-2"><BarChart3 size={21} /><h2 className="text-lg font-bold">Content</h2></div><div className="mt-4">{videos.length ? <StudioVideoTable initial={serialized} /> : <EmptyState icon={<Upload size={30} />} title="Publish your first video" body="Upload a source file and Vixo will create adaptive HLS renditions and a thumbnail automatically." action="Choose a video" href="/studio/upload" />}</div></div>;
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="surface rounded-xl border border-ui p-5"><div className="flex items-center gap-2 text-sm text-muted">{icon}{label}</div><p className="mt-3 text-2xl font-bold tracking-tight">{value}</p></div>; }
