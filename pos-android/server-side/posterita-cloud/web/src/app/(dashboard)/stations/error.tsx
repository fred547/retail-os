"use client";

import DashboardError from "@/components/DashboardError";

export default function StationsError({
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
      tag="StationsPage"
      title="Failed to load stations"
    />
  );
}
