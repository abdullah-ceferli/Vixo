import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { VideoCard } from "@/components/video-card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Watch history" };
export default async function HistoryPage() { const user = await getCurrentUser(); if (!user) redirect("/login"); const items = await prisma.watchHistory.findMany({ where: { userId: user.id, video: { status: "READY", OR: [{ visibility: "PUBLIC" }, { channel: { ownerId: user.id } }] } }, include: { video: { include: { channel: { select: { name: true, handle: true, avatarUrl: true } } } } }, orderBy: { watchedAt: "desc" }, take: 100 }); return <div className="page-enter mx-auto max-w-7xl px-5 py-8"><h1 className="text-2xl font-bold">Watch history</h1>{items.length ? <div className="mt-7 grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{items.map(({ video }) => <VideoCard key={video.id} video={video} />)}</div> : <EmptyState icon={<History size={30} />} title="No watch history yet" body="Videos you watch while signed in will appear here, along with saved playback progress." action="Start watching" href="/" />}</div>; }
