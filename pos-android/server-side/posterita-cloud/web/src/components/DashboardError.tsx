"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
  tag,
  title,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  tag: string;
  title: string;
}) {
  useEffect(() => {
    fetch("/api/errors/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        severity: "ERROR",
        tag,
        message: error.message,
        stack_trace: error.stack,
      }),
    }).catch(() => {});
  }, [error, tag]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="text-red-500 mb-4" size={48} />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
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
