import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MarkNotificationsRead } from "@/components/mark-notifications-read";
import { getCurrentUser } from "@/lib/auth";
import { relativeDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Notifications" };
export default async function NotificationsPage() { const user = await getCurrentUser(); if (!user) redirect("/login"); const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }); return <div className="page-enter mx-auto max-w-3xl px-5 py-8"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Notifications</h1>{notifications.some((item) => !item.readAt) && <MarkNotificationsRead />}</div>{notifications.length ? <div className="mt-6 overflow-hidden rounded-xl border border-ui">{notifications.map((item) => { const content = <div className={`flex gap-4 border-b border-ui p-4 last:border-0 ${item.readAt ? "" : "bg-red-500/5"}`}><span className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full ${item.readAt ? "surface-2" : "bg-red-500 text-white"}`}><Bell size={17} /></span><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-sm text-muted">{item.body}</p><p className="mt-1 text-xs text-muted">{relativeDate(item.createdAt)}</p></div></div>; return item.href ? <Link href={item.href} key={item.id}>{content}</Link> : <div key={item.id}>{content}</div>; })}</div> : <EmptyState icon={<Bell size={30} />} title="All quiet" body="Processing updates and activity from channels you follow will appear here." />}</div>; }
