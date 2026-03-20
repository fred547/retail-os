import { SkeletonTable } from "@/components/Skeleton";

export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 bg-gray-200 rounded animate-pulse w-32" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-56 mt-2" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 bg-gray-200 rounded-lg animate-pulse w-14" />
          <div className="h-9 bg-gray-200 rounded-lg animate-pulse w-14" />
          <div className="h-9 bg-gray-200 rounded-lg animate-pulse w-16" />
        </div>
      </div>
      <SkeletonTable rows={10} columns={10} />
    </div>
  );
}
