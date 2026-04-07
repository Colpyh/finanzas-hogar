"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center gap-4">
      <h2 className="text-xl font-semibold text-destructive">Algo salió mal</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        {error.message ?? "Error inesperado. Por favor intentá de nuevo."}
      </p>
      <Button variant="outline" onClick={reset}>
        Intentar de nuevo
      </Button>
    </div>
  );
}
