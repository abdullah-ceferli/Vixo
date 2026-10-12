import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PlaylistManager } from "@/components/playlist-manager";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Playlists" };
export default async function PlaylistsPage() { const user = await getCurrentUser(); if (!user) redirect("/login"); const playlists = await prisma.playlist.findMany({ where: { userId: user.id }, include: { videos: { orderBy: { position: "asc" }, include: { video: { select: { id: true, title: true, thumbnailUrl: true } } } } }, orderBy: { updatedAt: "desc" } }); return <div className="page-enter mx-auto max-w-6xl px-5 py-8"><h1 className="text-2xl font-bold">Playlists</h1><p className="mt-1 text-sm text-muted">Organize videos into collections.</p><div className="mt-6"><Suspense><PlaylistManager initial={playlists} /></Suspense></div></div>; }
