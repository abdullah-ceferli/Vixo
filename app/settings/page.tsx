import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { SettingsForm } from "@/components/settings-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Settings" };
export default async function SettingsPage() { const user = await getCurrentUser(); if (!user) redirect("/login"); return <div className="page-enter mx-auto max-w-3xl px-5 py-8"><div className="mb-7 flex items-center justify-between"><div><h1 className="text-2xl font-bold">Settings</h1><p className="mt-1 text-sm text-muted">Manage your account and channel identity.</p></div><LogoutButton /></div><SettingsForm user={{ username: user.username, email: user.email, avatarUrl: user.avatarUrl }} channel={user.channel ? { name: user.channel.name, handle: user.channel.handle, description: user.channel.description, avatarUrl: user.channel.avatarUrl, bannerUrl: user.channel.bannerUrl } : null} /></div>; }
