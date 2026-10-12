import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { VideoCard } from "@/components/video-card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
  const { category, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = 24;
  const user = await getCurrentUser();
  const where = { status: "READY" as const, visibility: "PUBLIC" as const, ...(category ? { category } : {}) };
  const [videos, categories, total] = await Promise.all([
    prisma.video.findMany({ where, include: { channel: { select: { name: true, handle: true, avatarUrl: true } } }, orderBy: [{ publishedAt: "desc" }, { viewCount: "desc" }], skip: (page - 1) * perPage, take: perPage }),
    prisma.video.findMany({ where: { status: "READY", visibility: "PUBLIC" }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    prisma.video.count({ where }),
  ]);
  return (
    <div className="page-enter px-4 py-5 sm:px-6 lg:px-8">
      <div className="sticky top-16 z-20 -mx-4 -mt-5 mb-6 flex gap-2 overflow-x-auto border-b border-ui bg-[var(--background)]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Link href="/" className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${!category ? "bg-[var(--foreground)] text-[var(--background)]" : "surface-2 hover:brightness-95"}`}>All</Link>
        {categories.map((item) => <Link key={item.category} href={`/?category=${encodeURIComponent(item.category)}`} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${category === item.category ? "bg-[var(--foreground)] text-[var(--background)]" : "surface-2 hover:brightness-95"}`}>{item.category}</Link>)}
      </div>
      {videos.length ? <>
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div>
        {total > perPage && <div className="mt-12 flex justify-center gap-3">{page > 1 && <Link className="button-secondary" href={`/?${category ? `category=${encodeURIComponent(category)}&` : ""}page=${page - 1}`}>Previous</Link>}{page * perPage < total && <Link className="button-secondary" href={`/?${category ? `category=${encodeURIComponent(category)}&` : ""}page=${page + 1}`}>Next</Link>}</div>}
      </> : <EmptyState icon={<Clapperboard size={30} />} title={category ? `No ${category} videos yet` : "A fresh screen, ready for stories"} body={category ? "Try another category or publish the first video here." : "Vixo never pads an empty library with fake videos. Upload something worth watching and it will appear here after processing."} action={user ? "Upload a video" : "Create an account"} href={user ? "/studio/upload" : "/register"} />}
    </div>
  );
}
