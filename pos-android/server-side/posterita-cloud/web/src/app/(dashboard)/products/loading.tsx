import { SkeletonTable } from "@/components/Skeleton";

export default function ProductsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 bg-gray-200 rounded animate-pulse w-32" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mt-2" />
        </div>
        <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-28" />
      </div>
      <div className="flex gap-4">
        <div className="flex-1 h-11 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-11 bg-gray-200 rounded-lg animate-pulse w-40" />
      </div>
      <SkeletonTable rows={10} columns={8} />
    </div>
  );
}
