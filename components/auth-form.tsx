"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Logo } from "@/components/logo";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request failed");
      router.push(mode === "register" ? "/studio/channel" : "/");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  const register = mode === "register";
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-5 py-12">
      <div className="surface w-full rounded-2xl border border-ui p-6 shadow-[0_16px_50px_rgba(0,0,0,.08)] sm:p-9">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold tracking-tight">{register ? "Create your Vixo account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-muted">{register ? "Start a channel, publish videos, and join the conversation." : "Sign in to continue watching and creating."}</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {register && <label className="block"><span className="mb-1.5 block text-sm font-semibold">Username</span><input className="input" name="username" required minLength={3} maxLength={40} autoComplete="username" placeholder="yourname" /></label>}
          <label className="block"><span className="mb-1.5 block text-sm font-semibold">Email</span><input className="input" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold">Password</span><span className="relative block"><input className="input pr-11" name="password" type={showPassword ? "text" : "password"} required minLength={register ? 10 : 1} autoComplete={register ? "new-password" : "current-password"} placeholder={register ? "10+ characters, uppercase and number" : "Your password"} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
          {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}
          <button disabled={loading} className="button-primary w-full disabled:opacity-60">{loading ? <LoaderCircle size={19} className="animate-spin" /> : <>{register ? "Create account" : "Sign in"}<ArrowRight size={18} /></>}</button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">{register ? "Already have an account?" : "New to Vixo?"} <Link href={register ? "/login" : "/register"} className="font-semibold text-[var(--foreground)] hover:underline">{register ? "Sign in" : "Create an account"}</Link></p>
      </div>
    </div>
  );
}
