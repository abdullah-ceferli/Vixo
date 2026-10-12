"use client";

import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileVideo, LoaderCircle, UploadCloud, X } from "lucide-react";

const categories = ["Education", "Entertainment", "Gaming", "Music", "News", "Science & Technology", "Sports", "Travel", "Other"];

export function UploadForm() {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "done">("idle");
  const [error, setError] = useState("");

  function accept(files: FileList | null) {
    const next = files?.[0];
    if (!next) return;
    if (!next.type.startsWith("video/")) return setError("Choose a supported video file.");
    setFile(next); setError("");
  }
  function drop(event: DragEvent) { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setError("Choose a video before continuing.");
    const form = new FormData(event.currentTarget);
    setPhase("uploading"); setError(""); setProgress(0);
    controller.current = new AbortController();
    try {
      const createResponse = await fetch("/api/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.current.signal, body: JSON.stringify({ title: form.get("title"), description: form.get("description"), visibility: form.get("visibility"), category: form.get("category"), tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean), fileName: file.name, fileSize: file.size, mimeType: file.type }) });
      const created = await createResponse.json();
      if (!createResponse.ok) throw new Error(created.error || "Could not begin upload");
      let offset = 0;
      while (offset < file.size) {
        const chunk = file.slice(offset, Math.min(offset + created.chunkSize, file.size));
        const response = await fetch(`/api/uploads/${created.uploadId}/chunk`, { method: "PUT", signal: controller.current.signal, headers: { "Content-Type": "application/octet-stream", "Upload-Offset": String(offset), "Upload-Length": String(chunk.size) }, body: chunk });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Upload interrupted");
        offset = result.offset;
        setProgress(Math.round((offset / file.size) * 100));
      }
      setPhase("processing");
      const completeResponse = await fetch(`/api/uploads/${created.uploadId}/complete`, { method: "POST", signal: controller.current.signal });
      const complete = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(complete.error || "Could not process upload");
      setPhase("done");
      setTimeout(() => { router.push(`/studio?video=${complete.videoId}`); router.refresh(); }, 900);
    } catch (cause) {
      if ((cause as Error).name !== "AbortError") setError(cause instanceof Error ? cause.message : "Upload failed");
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";
  return <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
    <div className="space-y-6">
      <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop} onClick={() => !busy && picker.current?.click()} className={`grid min-h-72 place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-red-400 bg-red-500/5" : "border-ui surface hover:bg-[var(--surface-2)]"} ${busy ? "cursor-default" : "cursor-pointer"}`}>
        <input ref={picker} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => accept(event.target.files)} />
        {file ? <div><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-500"><FileVideo size={30} /></div><h2 className="mt-4 max-w-lg break-all font-semibold">{file.name}</h2><p className="mt-1 text-sm text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>{!busy && <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="button-secondary mt-4"><X size={17} /> Remove</button>}</div> : <div><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl surface-2"><UploadCloud size={30} /></div><h2 className="mt-4 text-lg font-bold">Drop a video here</h2><p className="mt-2 text-sm text-muted">or click to choose MP4, WebM, MOV, MKV, or AVI</p><p className="mt-1 text-xs text-muted">Uploads are sent in resumable 8 MB chunks</p></div>}
      </div>
      {busy && <div className="surface rounded-xl border border-ui p-5"><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-semibold">{phase === "uploading" && <LoaderCircle size={17} className="animate-spin" />}{phase === "processing" && <LoaderCircle size={17} className="animate-spin" />}{phase === "done" && <CheckCircle2 size={17} className="text-emerald-500" />}{phase === "uploading" ? "Uploading" : phase === "processing" ? "Queued for processing" : "Upload complete"}</span><span>{phase === "uploading" ? `${progress}%` : phase === "done" ? "100%" : ""}</span></div><div className="surface-2 mt-3 h-2 overflow-hidden rounded-full"><div className="h-full bg-red-500 transition-[width]" style={{ width: `${phase === "processing" ? 100 : progress}%` }} /></div>{phase === "uploading" && <button type="button" onClick={() => controller.current?.abort()} className="mt-3 text-xs font-semibold text-red-500">Cancel upload</button>}</div>}
    </div>
    <div className="surface h-fit space-y-5 rounded-2xl border border-ui p-6">
      <h2 className="text-lg font-bold">Video details</h2>
      <label className="block"><span className="mb-1.5 block text-sm font-semibold">Title</span><input className="input" name="title" required maxLength={160} disabled={busy} placeholder="A clear, specific title" /></label>
      <label className="block"><span className="mb-1.5 block text-sm font-semibold">Description</span><textarea className="input min-h-32 resize-y" name="description" maxLength={20000} disabled={busy} placeholder="Tell viewers what this video is about" /></label>
      <label className="block"><span className="mb-1.5 block text-sm font-semibold">Category</span><select className="input" name="category" disabled={busy}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="block"><span className="mb-1.5 block text-sm font-semibold">Tags</span><input className="input" name="tags" disabled={busy} placeholder="tutorial, design, camera" /><span className="mt-1 block text-xs text-muted">Separate tags with commas.</span></label>
      <label className="block"><span className="mb-1.5 block text-sm font-semibold">Visibility</span><select className="input" name="visibility" defaultValue="PRIVATE" disabled={busy}><option value="PRIVATE">Private — only you</option><option value="UNLISTED">Unlisted — anyone with the link</option><option value="PUBLIC">Public — visible to everyone</option></select></label>
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
      <button disabled={busy || !file} className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle size={18} className="animate-spin" /> : <UploadCloud size={18} />} Upload video</button>
    </div>
  </form>;
}
