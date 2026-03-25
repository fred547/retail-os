"use client";

import DashboardError from "@/components/DashboardError";

export default function TillsError({
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
      tag="TillsPage"
      title="Failed to load till history"
    />
  );
}
