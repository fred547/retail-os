"use client";

import DashboardError from "@/components/DashboardError";

export default function BrandsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardError
      error={error}
      reset={reset}
      tag="BrandsPage"
      title="Failed to load brands"
    />
  );
}
