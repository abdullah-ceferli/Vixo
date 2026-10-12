"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Send } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { relativeDate } from "@/lib/format";

type CommentItem = { id: string; body: string; createdAt: Date | string; user: { username: string; avatarUrl: string | null }; replies: Array<{ id: string; body: string; createdAt: Date | string; user: { username: string; avatarUrl: string | null } }> };

export function Comments({ videoId, initial, authenticated }: { videoId: string; initial: CommentItem[]; authenticated: boolean }) {
  const router = useRouter();
  const [comments, setComments] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authenticated) return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
    const form = event.currentTarget; const data = new FormData(form); setBusy(true); setError("");
    const response = await fetch(`/api/videos/${videoId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: data.get("body") }) });
    const result = await response.json(); setBusy(false);
    if (!response.ok) return setError(result.error || "Could not post comment");
    setComments([{ ...result.comment, replies: [] }, ...comments]); form.reset();
  }
  return <section className="mt-7"><h2 className="flex items-center gap-2 text-lg font-bold"><MessageCircle size={21} /> {comments.length} comments</h2><form onSubmit={submit} className="mt-5 flex gap-3"><div className="surface-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold">YOU</div><div className="flex-1"><textarea name="body" className="input min-h-11 resize-y" required maxLength={5000} placeholder={authenticated ? "Add a thoughtful comment" : "Sign in to join the conversation"} /><div className="mt-2 flex justify-end"><button disabled={busy} className="button-primary !py-2"><Send size={16} /> Comment</button></div>{error && <p className="mt-2 text-sm text-red-500">{error}</p>}</div></form><div className="mt-7 space-y-7">{comments.map((comment) => <article key={comment.id} className="flex gap-3"><Avatar name={comment.user.username} url={comment.user.avatarUrl} /><div className="min-w-0"><p className="text-sm"><span className="font-semibold">@{comment.user.username}</span><span className="ml-2 text-xs text-muted">{relativeDate(new Date(comment.createdAt))}</span></p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{comment.body}</p>{comment.replies.map((reply) => <div key={reply.id} className="mt-4 flex gap-3"><Avatar name={reply.user.username} url={reply.user.avatarUrl} size="sm" /><div><p className="text-xs font-semibold">@{reply.user.username} <span className="ml-1 font-normal text-muted">{relativeDate(new Date(reply.createdAt))}</span></p><p className="mt-1 text-sm">{reply.body}</p></div></div>)}</div></article>)}{!comments.length && <p className="py-8 text-center text-sm text-muted">No comments yet. Start the conversation.</p>}</div></section>;
}
