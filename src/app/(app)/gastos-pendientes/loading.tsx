import { LoadingSkeleton } from "@/shared/components/loading-skeleton";

export default function GastosPendientesLoading() {
  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="h-8 w-44 bg-muted rounded animate-pulse" />
      <LoadingSkeleton />
    </div>
  );
}
