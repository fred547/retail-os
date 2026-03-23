/**
 * Client-side error logger — sends errors to /api/errors/log
 * which writes to the same error_logs table as Android AppErrorLogger.
 *
 * Usage:
 *   logError("DataProxy", "Query failed for product table", { table: "product" });
 *   logWarn("Sync", "Timeout waiting for response");
 */

type Severity = "ERROR" | "WARN" | "INFO" | "FATAL";

interface ErrorLogPayload {
  severity: Severity;
  tag: string;
  message: string;
  stacktrace?: string;
  screen?: string;
  extra?: Record<string, any>;
}

async function sendLog(payload: ErrorLogPayload) {
  try {
    await fetch("/api/errors/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        screen: payload.screen || (typeof window !== "undefined" ? window.location.pathname : undefined),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }),
    });
  } catch (_) {
    // Never let error logging crash the app
    console.warn("[ErrorLogger] Failed to send error log");
  }
}

export function logError(tag: string, message: string, extra?: Record<string, any>) {
  console.error(`[${tag}]`, message, extra || "");
  sendLog({ severity: "ERROR", tag, message: extra ? `${message} | ${JSON.stringify(extra)}` : message });
}

export function logWarn(tag: string, message: string, extra?: Record<string, any>) {
  console.warn(`[${tag}]`, message, extra || "");
  sendLog({ severity: "WARN", tag, message: extra ? `${message} | ${JSON.stringify(extra)}` : message });
}

export function logInfo(tag: string, message: string) {
  sendLog({ severity: "INFO", tag, message });
}

export function logFatal(tag: string, message: string, error?: Error) {
  console.error(`[FATAL][${tag}]`, message, error);
  sendLog({
    severity: "FATAL",
    tag,
    message,
    stacktrace: error?.stack,
  });
}
