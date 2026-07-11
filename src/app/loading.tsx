import Image from "next/image";

/**
 * Loading raíz: fallback para rutas sin skeleton propio y para la carga
 * inicial de la app — el usuario ve el logo pulsando en vez de pantalla
 * negra. Los skeletons por ruta (dashboard, compras, etc.) tienen prioridad.
 */
export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background">
      <Image
        src="/icons/icon-192.png"
        alt="Finanzas Hogar"
        width={72}
        height={72}
        priority
        className="animate-pulse"
      />
      <p className="text-sm text-muted-foreground animate-pulse">Cargando tu hogar…</p>
    </div>
  );
}
