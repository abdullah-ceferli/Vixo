export function Avatar({ name, url, size = "md" }: { name: string; url?: string | null; size?: "sm" | "md" | "lg" }) {
  const classes = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";
  if (url) return <img src={url} alt="" className={`${classes} rounded-full object-cover ring-1 ring-black/5`} />;
  return <span aria-hidden className={`${classes} grid shrink-0 place-items-center rounded-full bg-zinc-800 font-bold text-white`}>{name.slice(0, 1).toUpperCase()}</span>;
}
