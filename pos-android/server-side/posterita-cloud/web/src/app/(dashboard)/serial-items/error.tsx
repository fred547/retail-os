"use client";

import DashboardError from "@/components/DashboardError";

export default function SerialItemsError({
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
      tag="SerialItemsPage"
      title="Failed to load serial items"
    />
  );
}
