"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Check,
  ChevronDown,
} from "lucide-react";

const INDUSTRIES = [
  { id: "restaurant", label: "Restaurant", emoji: "\uD83C\uDF54" },
  { id: "fashion", label: "Fashion", emoji: "\uD83D\uDC57" },
  { id: "cafe", label: "Caf\u00e9", emoji: "\u2615" },
  { id: "grocery", label: "Grocery", emoji: "\uD83D\uDED2" },
  { id: "electronics", label: "Electronics", emoji: "\uD83D\uDCBB" },
  { id: "warehouse", label: "Warehouse", emoji: "\uD83D\uDCE6" },
] as const;

const COUNTRIES = [
  { code: "MU", label: "Mauritius" },
  { code: "ZA", label: "South Africa" },
  { code: "KE", label: "Kenya" },
  { code: "IN", label: "India" },
  { code: "GB", label: "UK" },
  { code: "FR", label: "France" },
  { code: "US", label: "US" },
  { code: "BR", label: "Brazil" },
  { code: "AE", label: "UAE" },
] as const;

type IndustryId = (typeof INDUSTRIES)[number]["id"];
type CountryCode = (typeof COUNTRIES)[number]["code"];

export default function DemoPage() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryId | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("MU");
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for existing session on mount — redirect to console if active
  useEffect(() => {
    async function checkExisting() {
      try {
        const res = await fetch("/api/demo/status");
        if (!res.ok) return;
        const data = await res.json();
        if (data.current_session && data.current_session.time_remaining_seconds > 0) {
          router.push("/customer");
        }
      } catch (_) {
        /* ignore */
      }
    }
    checkExisting();
  }, [router]);

  // Clear retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const claimDemo = useCallback(async () => {
    if (!selectedIndustry) {
      setError("Please pick an industry to continue.");
      setState("error");
      return;
    }

    setState("loading");
    setError(null);
    setRetryAfter(null);

    try {
      const params = new URLSearchParams({
        industry: selectedIndustry,
        country: selectedCountry,
      });
      const res = await fetch(`/api/demo/claim?${params}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503) {
          setError("All demo slots are in use. Try again in a few minutes.");
          setRetryAfter(data.retry_after || 60);
        } else if (res.status === 429) {
          setError("Too many demo requests from your network. Please wait a moment.");
          setRetryAfter(data.retry_after || 60);
        } else {
          setError(data.message || "Could not start demo. Please try again.");
        }
        setState("error");
        return;
      }

      // Success — redirect to web console
      router.push("/customer");
    } catch (_) {
      setError("Network error. Please check your connection and try again.");
      setState("error");
    }
  }, [selectedIndustry, selectedCountry, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-3">
            Try Posterita — Full Demo
          </h1>
          <p className="text-lg text-slate-600">
            No signup required. Full access for 2 hours.
          </p>
        </div>

        {/* Industry picker */}
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-700 mb-3 text-center">
            Pick your industry:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INDUSTRIES.map(({ id, label, emoji }) => (
              <button
                key={id}
                onClick={() => setSelectedIndustry(id)}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                  selectedIndustry === id
                    ? "border-blue-600 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className={`font-medium ${selectedIndustry === id ? "text-blue-900" : "text-slate-700"}`}>
                  {label}
                </span>
                {selectedIndustry === id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Country picker */}
        <div className="mb-10 flex justify-center">
          <div className="w-64">
            <label className="block text-sm font-medium text-slate-700 mb-1.5 text-center">
              Your country:
            </label>
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value as CountryCode)}
                className="w-full appearance-none bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:border-blue-500 transition-colors pr-10"
              >
                {COUNTRIES.map(({ code, label }) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mb-10">
          {state === "idle" && (
            <button
              onClick={claimDemo}
              disabled={!selectedIndustry}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-5 h-5" />
              Start Demo — Instant Access
            </button>
          )}

          {state === "loading" && (
            <div className="inline-flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold opacity-90">
              <Loader2 className="w-5 h-5 animate-spin" />
              Setting up your demo store...
            </div>
          )}

          {state === "error" && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-6 py-3 rounded-xl font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
              <div>
                <button
                  onClick={claimDemo}
                  disabled={!!retryAfter}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Feature checklist */}
        <div className="flex flex-col items-center gap-2 text-sm text-slate-600 mb-12">
          {[
            "15 products pre-loaded with images",
            "Orders, customers, and reports ready",
            "Full POS, inventory, and analytics",
            "Create your own products and orders",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Fine print */}
        <div className="text-center text-sm text-slate-400">
          <p>
            Demo sessions last 2 hours and extend automatically while you are active.
          </p>
          <p className="mt-1">
            Ready for the real thing?{" "}
            <a href="/customer/signup" className="text-blue-500 hover:underline">
              Create a free account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
