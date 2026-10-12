import { redirect } from "next/navigation";
import { ThumbsUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { VideoCard } from "@/components/video-card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Liked videos" };
export default async function LikedPage() { const user = await getCurrentUser(); if (!user) redirect("/login"); const likes = await prisma.videoLike.findMany({ where: { userId: user.id, type: "LIKE", video: { status: "READY" } }, include: { video: { include: { channel: { select: { name: true, handle: true, avatarUrl: true } } } } }, orderBy: { createdAt: "desc" } }); return <div className="page-enter mx-auto max-w-7xl px-5 py-8"><h1 className="text-2xl font-bold">Liked videos</h1>{likes.length ? <div className="mt-7 grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{likes.map(({ video }) => <VideoCard key={video.id} video={video} />)}</div> : <EmptyState icon={<ThumbsUp size={30} />} title="Nothing liked yet" body="Use the like button to keep a personal collection of videos you appreciate." action="Explore videos" href="/" />}</div>; }
