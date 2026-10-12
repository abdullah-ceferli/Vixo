import { redirect } from "next/navigation";
import { Radio } from "lucide-react";
import { ChannelForm } from "@/components/channel-form";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Create channel" };
export default async function ChannelSetupPage() {
  const user = await requireUser();
  if (user.channel) redirect("/studio");
  return <div className="mx-auto max-w-2xl px-5 py-12"><div className="surface rounded-2xl border border-ui p-6 sm:p-9"><div className="surface-2 grid h-12 w-12 place-items-center rounded-xl"><Radio size={24} /></div><h1 className="mt-5 text-2xl font-bold tracking-tight">Create your channel</h1><p className="mt-2 max-w-lg text-sm leading-6 text-muted">Your channel is your public identity on Vixo. You can refine the description and artwork later.</p><ChannelForm defaultName={user.username} defaultHandle={user.username.toLowerCase().replace(/[^a-z0-9_-]/g, "")} /></div></div>;
}
