"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/auth/actions";
import { Eye, EyeOff } from "lucide-react";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);

    const result = await signUp(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-[72px] h-[72px] rounded-[22px] bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/40 text-3xl">
              ✉️
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Finanzas Hogar</h1>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-3 text-center">
          <h2 className="text-base font-semibold text-foreground">Confirma tu correo</h2>
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace de verificación a <span className="font-medium text-foreground">{email}</span>.
            Revisa tu bandeja de entrada para activar tu cuenta.
          </p>
          <Link href="/auth/login" className="text-sm text-primary font-medium hover:underline block mt-2">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-[72px] h-[72px] rounded-[22px] bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/40">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Finanzas Hogar</h1>
          <p className="text-sm text-muted-foreground mt-1">Control de gastos para tu familia</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Crear cuenta</h2>
          <p className="text-sm text-muted-foreground">Regístrate para empezar a usar la app</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              disabled={loading}
              autoComplete="email"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                disabled={loading}
                autoComplete="new-password"
                className="h-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-sm font-medium">Confirmar contraseña</Label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="new-password"
              className="h-11"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/8 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full h-11 font-medium shadow-sm shadow-primary/20" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
