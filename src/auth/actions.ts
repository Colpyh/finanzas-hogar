"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { cookies } from "next/headers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Devuelve el destino en vez de hacer redirect() en la action: el cliente
// navega con window.location.assign (recarga completa — límite de auth, sin
// restos de la sesión anterior). Con redirect() en la action, un rebote
// volvía al login con `loading` pegado en true ("Ingresando…" eterno).
export async function signInWithCredentials(
  email: string,
  password: string,
  returnTo?: string
): Promise<{ error?: string; destination?: string }> {
  const destination = returnTo && returnTo.startsWith("/") ? returnTo : "/dashboard";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Correo o contraseña incorrectos." };
  } catch (e) {
    console.error("[auth] signIn failed", e);
    return { error: "Error de conexión. Intentá de nuevo más tarde." };
  }

  return { destination };
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

// Sin redirect() en la action: el cliente hace window.location.assign para
// que el logout sea una recarga completa (misma razón que el login — límite
// de auth = página nueva, sin restos de la sesión en la Router Cache).
export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("dev-session");

  const supabase = await createClient();
  await supabase.auth.signOut();
}
