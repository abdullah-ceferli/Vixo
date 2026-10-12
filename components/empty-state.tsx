import Link from "next/link";
import { ReactNode } from "react";

export function EmptyState({ icon, title, body, action, href }: { icon: ReactNode; title: string; body: string; action?: string; href?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="surface-2 mb-5 grid h-16 w-16 place-items-center rounded-2xl text-muted">{icon}</div>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      {action && href && <Link href={href} className="button-primary mt-6">{action}</Link>}
    </div>
  );
}
