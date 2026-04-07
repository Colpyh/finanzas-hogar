import { LoadingSkeleton } from "@/shared/components/loading-skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      <LoadingSkeleton />
    </div>
  );
}
