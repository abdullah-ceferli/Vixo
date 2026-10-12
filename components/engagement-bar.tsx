"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellPlus, ListPlus, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { formatCount } from "@/lib/format";

export function EngagementBar({ videoId, initialLikes, initialDislikes, initialReaction, subscribed, subscribers, ownChannel, authenticated }: { videoId: string; initialLikes: number; initialDislikes: number; initialReaction: "LIKE" | "DISLIKE" | null; subscribed: boolean; subscribers: number; ownChannel: boolean; authenticated: boolean }) {
  const router = useRouter();
  const [reaction, setReaction] = useState(initialReaction);
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [isSubscribed, setSubscribed] = useState(subscribed);
  const [subscriberCount, setSubscriberCount] = useState(subscribers);
  const [notice, setNotice] = useState("");
  function auth() { if (!authenticated) { router.push(`/login?next=${encodeURIComponent(location.pathname)}`); return false; } return true; }
  async function react(type: "LIKE" | "DISLIKE") { if (!auth()) return; const response = await fetch(`/api/videos/${videoId}/reaction`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) }); const data = await response.json(); if (response.ok) { setReaction(data.reaction); setLikes(data.likes); setDislikes(data.dislikes); } }
  async function subscribe() { if (!auth()) return; const response = await fetch(`/api/videos/${videoId}/subscribe`, { method: "POST" }); const data = await response.json(); if (response.ok) { setSubscribed(data.subscribed); setSubscriberCount(data.subscribers); } }
  async function share() { await navigator.clipboard.writeText(location.href); setNotice("Link copied"); setTimeout(() => setNotice(""), 1800); }
  return <div className="flex flex-wrap items-center gap-2">
    {!ownChannel && <button onClick={subscribe} className={isSubscribed ? "button-secondary" : "button-primary"}><BellPlus size={18} />{isSubscribed ? "Subscribed" : "Subscribe"}<span className="text-xs opacity-75">{formatCount(subscriberCount)}</span></button>}
    <div className="surface-2 flex overflow-hidden rounded-lg"><button onClick={() => react("LIKE")} className={`flex items-center gap-2 border-r border-ui px-3 py-2 text-sm font-semibold ${reaction === "LIKE" ? "text-red-500" : ""}`}><ThumbsUp size={18} fill={reaction === "LIKE" ? "currentColor" : "none"} />{formatCount(likes)}</button><button onClick={() => react("DISLIKE")} className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold ${reaction === "DISLIKE" ? "text-red-500" : ""}`} aria-label={`${dislikes} dislikes`}><ThumbsDown size={18} fill={reaction === "DISLIKE" ? "currentColor" : "none"} /></button></div>
    <button onClick={share} className="button-secondary"><Share2 size={18} /> Share</button>
    <button onClick={() => auth() && router.push(`/playlists?add=${videoId}`)} className="button-secondary"><ListPlus size={18} /> Save</button>
    {notice && <span className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-xl">{notice}</span>}
  </div>;
}
