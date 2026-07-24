import { LoadingSkeleton } from "@/shared/components/loading-skeleton";

export default function IngresosLoading() {
  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 bg-muted rounded animate-pulse" />
        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
      </div>
      <LoadingSkeleton />
    </div>
  );
}
