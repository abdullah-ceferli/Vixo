export default function Loading() {
  return <div className="grid grid-cols-1 gap-x-5 gap-y-8 p-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i}><div className="skeleton aspect-video rounded-xl" /><div className="mt-3 flex gap-3"><div className="skeleton h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-4 rounded" /><div className="skeleton h-3 w-1/2 rounded" /></div></div></div>)}</div>;
}
