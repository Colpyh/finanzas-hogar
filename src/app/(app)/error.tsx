"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: Props) {
  useEffect(() => {
    // Log digest only — don't expose stack traces to browser console in production
    console.error("[app-error]", error.digest ?? error.name);
  }, [error]);

  const isAuth =
    error?.message === "UNAUTHORIZED" || error?.name === "UnauthorizedError";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center gap-4">
      <div className="text-4xl">{isAuth ? "🔒" : "⚠️"}</div>
      <h2 className="text-xl font-semibold">
        {isAuth ? "Sesión expirada" : "Algo salió mal"}
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        {isAuth
          ? "Tu sesión expiró o no tenés acceso. Iniciá sesión nuevamente."
          : "Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio."}
      </p>
      <div className="flex gap-2">
        {isAuth ? (
          <Link href="/auth/login" className={buttonVariants()}>
            Iniciar sesión
          </Link>
        ) : (
          <>
            <Button variant="outline" onClick={reset}>
              Intentar de nuevo
            </Button>
            <Link href="/dashboard" className={buttonVariants({ variant: "ghost" })}>
              Ir al inicio
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
