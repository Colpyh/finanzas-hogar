import { ChartSkeleton, CardSkeleton } from "@/shared/components/loading-skeleton";

export default function ResumenLoading() {
  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="h-8 w-28 bg-muted rounded animate-pulse" />
      <div className="h-10 w-full bg-muted rounded animate-pulse" />
      <div className="rounded-xl border p-4">
        <ChartSkeleton />
      </div>
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
