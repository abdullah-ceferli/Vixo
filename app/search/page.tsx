import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { VideoCard } from "@/components/video-card";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Search" };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() ?? "";
  const videos = q ? await prisma.video.findMany({ where: { status: "READY", visibility: "PUBLIC", OR: [{ title: { contains: q } }, { description: { contains: q } }, { channel: { name: { contains: q } } }] }, include: { channel: { select: { name: true, handle: true, avatarUrl: true } } }, orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }], take: 50 }) : [];
  return <div className="page-enter mx-auto max-w-7xl px-5 py-8"><h1 className="text-xl font-bold">{q ? `Results for “${q}”` : "Search Vixo"}</h1><p className="mt-1 text-sm text-muted">{q && `${videos.length} result${videos.length === 1 ? "" : "s"}`}</p>{videos.length ? <div className="mt-7 grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div> : <EmptyState icon={<SearchX size={30} />} title={q ? "No matching videos" : "What do you want to watch?"} body={q ? "Try fewer words, a channel name, or a broader topic." : "Use the search field above to find videos and channels."} />}</div>;
}
