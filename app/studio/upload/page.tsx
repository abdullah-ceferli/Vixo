import { redirect } from "next/navigation";
import { UploadForm } from "@/components/upload-form";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Upload video" };
export default async function UploadPage() { const user = await requireUser(); if (!user.channel) redirect("/studio/channel"); return <div className="page-enter mx-auto max-w-6xl px-5 py-8"><div className="mb-7"><h1 className="text-2xl font-bold tracking-tight">Upload a video</h1><p className="mt-1 text-sm text-muted">Your video stays private until upload and processing finish.</p></div><UploadForm /></div>; }
