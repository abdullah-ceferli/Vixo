import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { VideoCard } from "@/components/video-card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Subscriptions" };
export default async function SubscriptionsPage() { const user = await getCurrentUser(); if (!user) redirect("/login"); const videos = await prisma.video.findMany({ where: { status: "READY", visibility: "PUBLIC", channel: { subscribers: { some: { subscriberId: user.id } } } }, include: { channel: { select: { name: true, handle: true, avatarUrl: true } } }, orderBy: { publishedAt: "desc" }, take: 60 }); return <div className="page-enter mx-auto max-w-7xl px-5 py-8"><h1 className="text-2xl font-bold">Subscriptions</h1>{videos.length ? <div className="mt-7 grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div> : <EmptyState icon={<Users size={30} />} title="Your subscription feed is empty" body="Subscribe to channels you enjoy and their latest public videos will collect here." action="Explore videos" href="/" />}</div>; }
