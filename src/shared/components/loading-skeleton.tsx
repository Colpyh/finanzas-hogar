import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-24" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <Skeleton className="h-40 w-40 rounded-full" />
      <div className="space-y-2 w-full">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}

/** Default list-page loading skeleton: 3 card skeletons */
export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
