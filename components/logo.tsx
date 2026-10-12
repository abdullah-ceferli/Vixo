import Link from "next/link";
import { Play } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-black tracking-[-0.04em]" aria-label="Vixo home">
      <span className="accent-bg grid h-8 w-10 place-items-center rounded-[9px] text-white shadow-sm"><Play size={17} fill="currentColor" /></span>
      {!compact && <span className="text-xl">Vixo</span>}
    </Link>
  );
}
