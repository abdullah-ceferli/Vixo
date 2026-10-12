import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Create account" };
export default async function RegisterPage() { if (await getCurrentUser()) redirect("/"); return <AuthForm mode="register" />; }
