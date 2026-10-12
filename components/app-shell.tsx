"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Bell, Compass, Heart, History, Library, LogIn, Menu, Moon, Search, Settings, Sun, Upload, Users, Video, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/avatar";

type ShellUser = { username: string; avatarUrl: string | null; channel: { handle: string } | null } | null;

const primary = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/subscriptions", label: "Subscriptions", icon: Users },
  { href: "/history", label: "History", icon: History },
];
const library = [
  { href: "/playlists", label: "Playlists", icon: Library },
  { href: "/liked", label: "Liked videos", icon: Heart },
  { href: "/studio", label: "Creator Studio", icon: Video },
];

export function AppShell({ children, user, notificationCount = 0 }: { children: ReactNode; user: ShellUser; notificationCount?: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");

  useEffect(() => {
    const saved = localStorage.getItem("vixo-theme") as "light" | "dark" | null;
    const next = saved ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = next;
    const timer = window.setTimeout(() => setTheme(next), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("vixo-theme", next);
    document.documentElement.dataset.theme = next;
  }

  function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const nav = (items: typeof primary) => items.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link key={href} href={href} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} className={`flex h-11 items-center gap-4 rounded-xl px-3 text-sm font-medium transition-colors ${active ? "surface-2 font-semibold" : "hover:surface-2"}`}>
        <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />{!collapsed && <span>{label}</span>}
      </Link>
    );
  });

  return (
    <div className="min-h-screen">
      <header className="surface fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-3 border-b border-ui px-3 md:px-5">
        <button onClick={() => innerWidth < 768 ? setMobileOpen(true) : setCollapsed(!collapsed)} className="grid h-10 w-10 place-items-center rounded-full hover:surface-2" aria-label="Toggle navigation"><Menu size={22} /></button>
        <div className="hidden min-w-[154px] sm:block"><Logo /></div>
        <form onSubmit={search} className="mx-auto flex w-full max-w-[680px] items-center">
          <div className="flex h-10 flex-1 items-center rounded-l-full border border-ui px-4 focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-400">
            <Search size={17} className="mr-3 hidden text-muted sm:block" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search videos and channels" aria-label="Search" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={17} /></button>}
          </div>
          <button className="surface-2 grid h-10 w-12 place-items-center rounded-r-full border border-l-0 border-ui hover:brightness-95" aria-label="Submit search"><Search size={19} /></button>
        </form>
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-full hover:surface-2" aria-label="Toggle color theme">{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}</button>
          {user ? <>
            <Link href="/studio/upload" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:surface-2 sm:flex"><Upload size={19} /> Upload</Link>
            <Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full hover:surface-2" aria-label="Notifications"><Bell size={20} />{notificationCount > 0 && <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{Math.min(notificationCount, 9)}{notificationCount > 9 ? "+" : ""}</span>}</Link>
            <Link href={user.channel ? `/channel/${user.channel.handle}` : "/studio/channel"} aria-label="Your profile"><Avatar name={user.username} url={user.avatarUrl} size="sm" /></Link>
          </> : <Link href="/login" className="button-secondary whitespace-nowrap !px-3"><LogIn size={18} /><span className="hidden sm:inline">Sign in</span></Link>}
        </div>
      </header>

      {mobileOpen && <button className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <aside className={`surface fixed bottom-0 left-0 top-16 z-50 border-r border-ui px-3 py-3 transition-[width,transform] duration-200 ${collapsed ? "w-[76px]" : "w-[232px]"} ${mobileOpen ? "translate-x-0" : "max-md:-translate-x-full"}`}>
        <nav className="space-y-1">{nav(primary)}</nav>
        <div className="my-3 border-t border-ui" />
        <nav className="space-y-1">{nav(library)}</nav>
        {user && <>
          <div className="my-3 border-t border-ui" />
          <Link href="/settings" className="flex h-11 items-center gap-4 rounded-xl px-3 text-sm font-medium hover:surface-2"><Settings size={20} />{!collapsed && "Settings"}</Link>
        </>}
        {!collapsed && <div className="absolute bottom-5 left-4 right-4 text-[11px] leading-relaxed text-muted"><p>Independent video, thoughtfully shared.</p><p className="mt-2">© {new Date().getFullYear()} Vixo</p></div>}
      </aside>
      <main className={`min-h-screen pt-16 transition-[padding] duration-200 ${collapsed ? "md:pl-[76px]" : "md:pl-[232px]"}`}>
        {children}
      </main>
    </div>
  );
}
