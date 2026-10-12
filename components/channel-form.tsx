"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, LoaderCircle } from "lucide-react";

export function ChannelForm({ defaultName, defaultHandle }: { defaultName: string; defaultHandle: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/channels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.error || "Could not create channel");
    router.push("/studio/upload"); router.refresh();
  }
  return <form onSubmit={submit} className="mt-7 space-y-5">
    <label className="block"><span className="mb-1.5 block text-sm font-semibold">Channel name</span><input name="name" className="input" defaultValue={defaultName} required maxLength={100} /></label>
    <label className="block"><span className="mb-1.5 block text-sm font-semibold">Handle</span><span className="relative block"><AtSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input name="handle" className="input !pl-9" defaultValue={defaultHandle} required minLength={3} maxLength={50} /></span></label>
    <label className="block"><span className="mb-1.5 block text-sm font-semibold">Description <span className="font-normal text-muted">(optional)</span></span><textarea name="description" className="input min-h-28 resize-y" maxLength={5000} placeholder="What will viewers find here?" /></label>
    {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
    <button className="button-primary" disabled={loading}>{loading && <LoaderCircle size={18} className="animate-spin" />} Create channel</button>
  </form>;
}
