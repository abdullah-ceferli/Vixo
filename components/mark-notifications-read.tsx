"use client";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
export function MarkNotificationsRead() { const router = useRouter(); return <button onClick={async () => { await fetch("/api/notifications", { method: "PATCH" }); router.refresh(); }} className="button-secondary"><CheckCheck size={17} /> Mark all read</button>; }
