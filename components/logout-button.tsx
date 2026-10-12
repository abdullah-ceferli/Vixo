"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
export function LogoutButton() { const router = useRouter(); return <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }} className="button-secondary text-red-500"><LogOut size={18} /> Sign out</button>; }
