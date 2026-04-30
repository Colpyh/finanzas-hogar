import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center gap-4">
      <div className="text-5xl font-bold text-muted-foreground">404</div>
      <h2 className="text-xl font-semibold">Página no encontrada</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        La página que buscás no existe o fue movida.
      </p>
      <Link href="/dashboard" className={buttonVariants()}>
        Ir al inicio
      </Link>
    </div>
  );
}
