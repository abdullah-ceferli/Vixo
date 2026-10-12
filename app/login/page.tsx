import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Sign in" };
export default async function LoginPage() { if (await getCurrentUser()) redirect("/"); return <AuthForm mode="login" />; }
