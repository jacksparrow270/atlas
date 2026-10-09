"use server";
import { db, configured } from "@/lib/supabase/server";
import { z } from "zod";
import { redirect } from "next/navigation";
export async function authenticate(form: FormData) {
  if (!configured())
    return { error: "Connect Supabase first using the setup instructions." };
  const mode = String(form.get("mode"));
  const email = z.email().safeParse(form.get("email"));
  const password = z.string().min(8).max(128).safeParse(form.get("password"));
  if (mode !== "reset" && !password.success)
    return { error: "Use a password with at least 8 characters." };
  if (mode !== "update" && !email.success)
    return { error: "Enter a valid email." };
  const client = await db();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (mode === "reset") {
    const { error } = await client.auth.resetPasswordForEmail(email.data!, {
      redirectTo: origin + "/auth/callback?next=/auth/update",
    });
    return {
      error: error?.message,
      message: error ? undefined : "Check your email for a recovery link.",
    };
  }
  if (mode === "update") {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { error: "Open the recovery link in your email first." };
    const { error } = await client.auth.updateUser({
      password: password.data!,
    });
    if (error) return { error: error.message };
    redirect("/dashboard");
  }
  if (mode === "signup") {
    const { error } = await client.auth.signUp({
      email: email.data!,
      password: password.data!,
      options: { emailRedirectTo: origin + "/auth/callback" },
    });
    return {
      error: error?.message,
      message: error
        ? undefined
        : "Account created. Check your email to confirm your address, then sign in.",
    };
  }
  const { error } = await client.auth.signInWithPassword({
    email: email.data!,
    password: password.data!,
  });
  if (error) return { error: error.message };
  redirect("/dashboard");
}
export async function logout() {
  if (configured()) {
    const client = await db();
    await client.auth.signOut();
  }
  redirect("/auth");
}
