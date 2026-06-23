"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function signInWithCredentials(
  email: string,
  password: string,
  returnTo?: string
): Promise<{ error?: string }> {
  const destination = returnTo && returnTo.startsWith("/") ? returnTo : "/dashboard";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Correo o contraseña incorrectos." };
  } catch (e) {
    console.error("[auth] signIn failed", e);
    return { error: "Error de conexión. Intentá de nuevo más tarde." };
  }

  redirect(destination);
}

export async function signUp(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  return {};
}

export async function signInWithGoogle(): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  return { url: data.url };
}

export async function sendPasswordReset(email: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/auth/update-password`,
  });

  if (error) return { error: error.message };
  return {};
}

export async function updatePassword(newPassword: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return {};
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("dev-session");

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
