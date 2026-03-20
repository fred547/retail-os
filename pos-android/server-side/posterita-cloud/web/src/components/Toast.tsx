"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  createdAt: number;
}

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Variant config                                                     */
/* ------------------------------------------------------------------ */

const VARIANT_CONFIG: Record<
  ToastVariant,
  { border: string; iconColor: string; Icon: typeof CheckCircle }
> = {
  success: { border: "border-l-green-500", iconColor: "text-green-500", Icon: CheckCircle },
  error:   { border: "border-l-red-500",   iconColor: "text-red-500",   Icon: XCircle },
  warning: { border: "border-l-amber-500", iconColor: "text-amber-500", Icon: AlertTriangle },
  info:    { border: "border-l-blue-500",  iconColor: "text-blue-500",  Icon: Info },
};

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 4000;

/* ------------------------------------------------------------------ */
/*  Single toast item                                                  */
/* ------------------------------------------------------------------ */

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  const { border, iconColor, Icon } = VARIANT_CONFIG[toast.variant];
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 250);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss]);

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-start gap-3
        w-80 rounded-lg border-l-4 ${border}
        bg-white shadow-lg dark:bg-gray-800
        p-4 pr-10
        transition-all duration-250
        ${exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100 animate-slide-in-right"}
      `}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />

      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {toast.title}
        </p>
        {toast.description && (
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            {toast.description}
          </p>
        )}
      </div>

      <button
        onClick={dismiss}
        className="absolute right-2 top-2 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      {/* progress bar */}
      <div className="absolute bottom-0 left-0 h-1 w-full">
        <div
          className={`h-full ${border.replace("border-l-", "bg-")} opacity-40`}
          style={{
            animation: `shrink-width ${AUTO_DISMISS_MS}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const newToast: ToastData = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      variant: input.variant ?? "info",
      createdAt: Date.now(),
    };
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), newToast]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-3"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>

      {/* Inline keyframes — no extra CSS file needed */}
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes shrink-width {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 250ms ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
