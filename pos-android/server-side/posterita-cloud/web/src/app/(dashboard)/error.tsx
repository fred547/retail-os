"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Global error boundary for all dashboard server components.
 * Catches unhandled errors and logs them to the error_logs table via API.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard error]", error);
    // Log to DB
    fetch("/api/errors/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        severity: "ERROR",
        tag: "DashboardPage",
        message: `${error.message} (digest: ${error.digest ?? "none"})`,
        stacktrace: error.stack,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="text-red-500 mb-4" size={48} />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-500 mb-6 max-w-md">{error.message}</p>
      <button
        onClick={reset}
        className="px-5 py-2 bg-posterita-blue text-white rounded-lg hover:bg-blue-700 transition"
      >
        Try Again
      </button>
    </div>
  );
}
