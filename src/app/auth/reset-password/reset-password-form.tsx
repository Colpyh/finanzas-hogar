"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordReset } from "@/auth/actions";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await sendPasswordReset(email);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
    }
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
        {success ? (
          <div className="space-y-3 text-center">
            <h2 className="text-base font-semibold text-foreground">Revisa tu correo</h2>
            <p className="text-sm text-muted-foreground">
              Si existe una cuenta con <span className="font-medium text-foreground">{email}</span>,
              recibirás un enlace para restablecer tu contraseña.
            </p>
            <Link href="/auth/login" className="text-sm text-primary font-medium hover:underline block mt-2">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Restablecer contraseña</h2>
              <p className="text-sm text-muted-foreground">
                Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
              </p>
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

              {error && (
                <p className="text-sm text-destructive bg-destructive/8 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
