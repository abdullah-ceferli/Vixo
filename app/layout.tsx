import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Vixo — Watch what matters", template: "%s · Vixo" },
  description: "A self-hosted home for independent video.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const notificationCount = user ? await prisma.notification.count({ where: { userId: user.id, readAt: null } }) : 0;
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Suspense><AppShell user={user ? { username: user.username, avatarUrl: user.avatarUrl, channel: user.channel ? { handle: user.channel.handle } : null } : null} notificationCount={notificationCount}>{children}</AppShell></Suspense>
      </body>
    </html>
  );
}
