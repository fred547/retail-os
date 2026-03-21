"use client";

import { useState } from "react";

interface ErrorLog {
  id: number;
  timestamp: number;
  severity: string;
  tag: string;
  message: string;
  stacktrace: string | null;
  screen: string | null;
  user_id: number;
  user_name: string | null;
  store_id: number;
  terminal_id: number;
  device_id: string | null;
  app_version: string | null;
  os_version: string | null;
  created_at: string;
}

function severityBadge(severity: string) {
  const classes: Record<string, string> = {
    FATAL: "bg-red-100 text-red-800 border-red-200",
    ERROR: "bg-orange-100 text-orange-800 border-orange-200",
    WARN: "bg-yellow-100 text-yellow-800 border-yellow-200",
    INFO: "bg-blue-100 text-blue-800 border-blue-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
        classes[severity] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {severity}
    </span>
  );
}

function formatTimestamp(ts: number) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function timeAgo(ts: number) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ErrorLogTable({ errors }: { errors: ErrorLog[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (errors.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-semibold text-gray-900">No errors</h3>
        <p className="text-gray-500 mt-1">
          All terminals are running smoothly
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-500">
              Time
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">
              Severity
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">
              Source
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">
              Message
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">
              Device
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">
              Version
            </th>
          </tr>
        </thead>
        <tbody>
          {errors.map((err) => (
            <>
              <tr
                key={err.id}
                className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  err.severity === "FATAL" ? "bg-red-50/50" : ""
                }`}
                onClick={() =>
                  setExpandedId(expandedId === err.id ? null : err.id)
                }
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-gray-900">
                    {formatTimestamp(err.timestamp)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {timeAgo(err.timestamp)}
                  </div>
                </td>
                <td className="px-4 py-3">{severityBadge(err.severity)}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {err.tag}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-xs truncate text-gray-700">
                  {err.message}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {err.device_id?.slice(0, 8) ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {err.app_version ?? "—"}
                </td>
              </tr>

              {/* Expanded detail row */}
              {expandedId === err.id && (
                <tr key={`${err.id}-detail`} className="bg-gray-50">
                  <td colSpan={6} className="px-4 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">User</div>
                        <div className="text-sm text-gray-900">
                          {err.user_name || `ID: ${err.user_id}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">
                          Store / Terminal
                        </div>
                        <div className="text-sm text-gray-900">
                          S:{err.store_id} / T:{err.terminal_id}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">
                          Device ID
                        </div>
                        <div className="text-sm font-mono text-gray-900">
                          {err.device_id ?? "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">OS</div>
                        <div className="text-sm text-gray-900">
                          {err.os_version ?? "—"}
                        </div>
                      </div>
                    </div>

                    {err.stacktrace && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">
                          Stack Trace
                        </div>
                        <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto max-h-64 overflow-y-auto font-mono">
                          {err.stacktrace}
                        </pre>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
