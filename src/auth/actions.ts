"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// Acceso temporal de desarrollo — reemplazar con Supabase auth cuando esté listo
const DEV_USER = process.env.DEV_USERNAME ?? "admin";
const DEV_PASS = process.env.DEV_PASSWORD ?? "admin";

export async function signInWithCredentials(
  username: string,
  password: string
): Promise<{ error?: string }> {
  // Acceso de desarrollo
  if (username === DEV_USER && password === DEV_PASS) {
    const cookieStore = await cookies();
    cookieStore.set("dev-session", "1", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 horas
      sameSite: "lax",
    });
    redirect("/dashboard");
  }

  // Intentar con Supabase (usuario real)
  let signInError: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });
    if (error) signInError = error.message;
  } catch (e) {
    return { error: `Error de conexión: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (signInError) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  redirect("/dashboard");
}

export async function signInWithMagicLink(email: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("dev-session");

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
