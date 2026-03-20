"use client";

import { useState } from "react";
import {
  Sparkles,
  Globe,
  ImageIcon,
  Loader2,
  Check,
  Package,
  Search,
  Upload,
  X,
  Store,
  MapPin,
  Phone,
  Clock,
  Tag,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

type Mode = "search" | "website" | "images";
type Step = "input" | "discover" | "processing" | "review";

interface BusinessCandidate {
  url: string;
  name: string;
  description: string;
  confidence: "high" | "medium" | "low";
}

interface StoreSetupResult {
  store_name: string;
  store_description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  opening_hours: string;
  currency: string;
  business_type: string;
  tax_rate: number;
  tax_name: string;
  categories: { name: string; products: any[] }[];
  stores: any[];
}

interface SaveResult {
  categories_created: number;
  products_created: number;
  stores_created: number;
}

export default function AiImportPage() {
  const [mode, setMode] = useState<Mode>("search");
  const [step, setStep] = useState<Step>("input");

  // Search mode inputs
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [businessType, setBusinessType] = useState("");

  // Website mode inputs
  const [urls, setUrls] = useState<string[]>([""]);

  // Discovery results
  const [candidates, setCandidates] = useState<BusinessCandidate[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  // Results
  const [setup, setSetup] = useState<StoreSetupResult | null>(null);
  const [saved, setSaved] = useState<SaveResult | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [progressHistory, setProgressHistory] = useState<string[]>([]);
  const [error, setError] = useState("");

  // ── SSE stream consumer ──
  const consumeSSEStream = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);
          try {
            const data = JSON.parse(dataStr);

            if (currentEvent === "progress") {
              setProgress(data.message);
              setProgressHistory((prev) => [...prev, data.message]);
            } else if (currentEvent === "result") {
              setSetup(data.setup || null);
              setSaved(data.saved || null);
              setStep("review");
            } else if (currentEvent === "error") {
              setError(data.message);
              setLoading(false);
            }
          } catch {
            // Ignore parse errors
          }
          currentEvent = "";
        }
      }
    }
  };

  // ── Mode 1: Smart Search ──
  const handleSearchMode = async () => {
    if (!businessName.trim()) return;
    setLoading(true);
    setError("");
    setProgress("Starting AI search...");
    setProgressHistory([]);
    setStep("processing");

    try {
      const response = await fetch("/api/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "search",
          business_name: businessName,
          location,
          business_type: businessType,
        }),
      });

      if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
        const data = await response.json();
        throw new Error(data.error || "Request failed");
      }

      await consumeSSEStream(response);
    } catch (e: any) {
      setError(e.message);
      setStep("input");
    } finally {
      setLoading(false);
    }
  };

  // ── Discover business websites ──
  const handleDiscover = async () => {
    if (!businessName.trim()) return;
    setLoading(true);
    setError("");
    setProgress("Discovering business websites...");

    try {
      const response = await fetch("/api/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "discover",
          business_name: businessName,
          location,
          business_type: businessType,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.candidates?.length) {
        setCandidates(data.candidates);
        const highConf = new Set<string>(
          data.candidates
            .filter((c: BusinessCandidate) => c.confidence === "high")
            .map((c: BusinessCandidate) => c.url)
        );
        setSelectedUrls(highConf);
        setStep("discover");
        setProgress(
          `Found ${data.candidates.length} online sources for ${businessName}`
        );
      } else {
        setError(
          "No websites found. Try Smart Search instead — AI will search the web directly."
        );
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Import from discovered URLs (streaming) ──
  const handleImportFromUrls = async () => {
    if (selectedUrls.size === 0) return;
    setLoading(true);
    setError("");
    setStep("processing");
    setProgress("Starting scan...");
    setProgressHistory([]);

    try {
      const response = await fetch("/api/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "website",
          urls: Array.from(selectedUrls),
          business_name: businessName,
          location,
          business_type: businessType,
        }),
      });

      if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
        const data = await response.json();
        throw new Error(data.error || "Request failed");
      }

      await consumeSSEStream(response);
    } catch (e: any) {
      setError(e.message);
      setStep("discover");
    } finally {
      setLoading(false);
    }
  };

  // ── Direct URL import (streaming) ──
  const handleUrlImport = async () => {
    const validUrls = urls.filter((u) => u.trim());
    if (!validUrls.length) return;

    setLoading(true);
    setError("");
    setStep("processing");
    setProgress("Starting scan...");
    setProgressHistory([]);

    try {
      const response = await fetch("/api/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "website",
          urls: validUrls,
          business_name: businessName,
          location,
          business_type: businessType,
        }),
      });

      if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
        const data = await response.json();
        throw new Error(data.error || "Request failed");
      }

      await consumeSSEStream(response);
    } catch (e: any) {
      setError(e.message);
      setStep("input");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep("input");
    setSetup(null);
    setSaved(null);
    setCandidates([]);
    setSelectedUrls(new Set());
    setProgress("");
    setProgressHistory([]);
    setError("");
  };

  const confidenceBadge = (conf: string) => {
    const colors: Record<string, string> = {
      high: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-gray-100 text-gray-500",
    };
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[conf] || colors.low}`}
      >
        {conf}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Dashboard", href: "/customer" }, { label: "AI Import" }]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          AI Store Setup & Product Import
        </h1>
        <p className="text-gray-500 mt-1">
          Set up your store with AI — discover products, prices, and images
          automatically
        </p>
      </div>

      {/* ── Step: Input ── */}
      {step === "input" && (
        <>
          {/* Mode Selector */}
          <div className="flex gap-4">
            <button
              onClick={() => setMode("search")}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition ${
                mode === "search"
                  ? "border-posterita-blue bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Search
                size={24}
                className={
                  mode === "search" ? "text-posterita-blue" : "text-gray-400"
                }
              />
              <div className="text-left">
                <div className="font-medium">Smart Search</div>
                <div className="text-xs text-gray-500">
                  AI finds your business online and extracts everything
                </div>
              </div>
            </button>
            <button
              onClick={() => setMode("website")}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition ${
                mode === "website"
                  ? "border-posterita-blue bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Globe
                size={24}
                className={
                  mode === "website" ? "text-posterita-blue" : "text-gray-400"
                }
              />
              <div className="text-left">
                <div className="font-medium">From URL</div>
                <div className="text-xs text-gray-500">
                  Paste specific website URLs to scan
                </div>
              </div>
            </button>
            <button
              onClick={() => setMode("images")}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition ${
                mode === "images"
                  ? "border-posterita-blue bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <ImageIcon
                size={24}
                className={
                  mode === "images" ? "text-posterita-blue" : "text-gray-400"
                }
              />
              <div className="text-left">
                <div className="font-medium">From Images</div>
                <div className="text-xs text-gray-500">
                  Upload product photos for AI analysis
                </div>
              </div>
            </button>
          </div>

          {/* Search Mode Input */}
          {mode === "search" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Craft Coffee Roasters"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && businessName.trim())
                      handleSearchMode();
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Port Louis, Mauritius"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Type
                  </label>
                  <input
                    type="text"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    placeholder="e.g. Coffee shop, Restaurant, Retail"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSearchMode}
                  disabled={loading || !businessName.trim()}
                  className="flex items-center gap-2 bg-posterita-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  {loading ? "Searching..." : "Find & Import Products"}
                </button>
                <button
                  onClick={handleDiscover}
                  disabled={loading || !businessName.trim()}
                  className="flex items-center gap-2 border border-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <Globe size={18} />
                  Discover Websites First
                </button>
              </div>
              <p className="text-xs text-gray-500">
                &ldquo;Find & Import&rdquo; searches the web directly and
                extracts products. &ldquo;Discover Websites&rdquo; lets you
                choose which sources to scan.
              </p>
            </div>
          )}

          {/* Website Mode Input */}
          {mode === "website" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Website URLs
              </label>
              {urls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      const newUrls = [...urls];
                      newUrls[i] = e.target.value;
                      setUrls(newUrls);
                    }}
                    placeholder="https://example.com/menu"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:border-posterita-blue focus:ring-2 focus:ring-posterita-blue/20 outline-none"
                  />
                  {urls.length > 1 && (
                    <button
                      onClick={() => setUrls(urls.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500 px-2"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex gap-3">
                <button
                  onClick={() => setUrls([...urls, ""])}
                  className="text-sm text-posterita-blue hover:underline"
                >
                  + Add another URL
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Business name (optional)"
                  className="px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue outline-none text-sm"
                />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location (optional)"
                  className="px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue outline-none text-sm"
                />
                <input
                  type="text"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="Business type (optional)"
                  className="px-4 py-2 rounded-lg border border-gray-200 focus:border-posterita-blue outline-none text-sm"
                />
              </div>
              <button
                onClick={handleUrlImport}
                disabled={loading || !urls.some((u) => u.trim())}
                className="flex items-center gap-2 bg-posterita-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                {loading ? "Scanning..." : "Scan & Import"}
              </button>
            </div>
          )}

          {/* Image Mode */}
          {mode === "images" && (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <ImageIcon className="mx-auto text-gray-300" size={48} />
              <h3 className="text-lg font-medium text-gray-700 mt-4">
                Drag & drop product images
              </h3>
              <p className="text-gray-500 mt-1 text-sm">
                or click to browse. Supports JPG, PNG, WebP
              </p>
              <button className="mt-4 bg-posterita-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                Select Images
              </button>
              <p className="text-xs text-gray-400 mt-4">
                Images are uploaded to Cloudinary, then analyzed by AI to
                extract product names, prices, and categories.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Step: Discover (select URLs) ── */}
      {step === "discover" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Online Sources for &ldquo;{businessName}&rdquo;
            </h2>
            <button
              onClick={resetAll}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Start Over
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Select which sources to scan for products. We&apos;ll combine data
            from all selected sources.
          </p>

          <div className="space-y-2">
            {candidates.map((c) => (
              <label
                key={c.url}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                  selectedUrls.has(c.url)
                    ? "border-posterita-blue bg-blue-50/50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedUrls.has(c.url)}
                  onChange={(e) => {
                    const newSet = new Set(selectedUrls);
                    if (e.target.checked) newSet.add(c.url);
                    else newSet.delete(c.url);
                    setSelectedUrls(newSet);
                  }}
                  className="mt-1 rounded border-gray-300 text-posterita-blue focus:ring-posterita-blue"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.name}</span>
                    {confidenceBadge(c.confidence)}
                  </div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {c.url}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {c.description}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleImportFromUrls}
              disabled={loading || selectedUrls.size === 0}
              className="flex items-center gap-2 bg-posterita-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Sparkles size={18} />
              )}
              {loading
                ? "Scanning..."
                : `Scan ${selectedUrls.size} Source${selectedUrls.size !== 1 ? "s" : ""}`}
            </button>
            <button
              onClick={handleSearchMode}
              disabled={loading}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              Skip & Search Directly
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Processing (with live progress) ── */}
      {step === "processing" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Loader2
                size={48}
                className="animate-spin text-posterita-blue"
              />
              <Sparkles
                size={16}
                className="absolute -top-1 -right-1 text-amber-400 animate-pulse"
              />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mt-6">
              AI is working on your import...
            </h3>
            <p className="text-posterita-blue font-medium mt-3 text-sm">
              {progress}
            </p>
          </div>

          {/* Live progress log */}
          {progressHistory.length > 1 && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {progressHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs ${
                      i === progressHistory.length - 1
                        ? "text-posterita-blue font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    {i === progressHistory.length - 1 ? (
                      <Loader2 size={12} className="animate-spin flex-shrink-0" />
                    ) : (
                      <Check size={12} className="text-green-500 flex-shrink-0" />
                    )}
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <div className="bg-blue-50 text-blue-600 text-xs px-4 py-2 rounded-lg inline-block">
              This may take 30–90 seconds depending on the business
            </div>
          </div>
        </div>
      )}

      {/* ── Step: Review Results ── */}
      {step === "review" && setup && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Import Results</h2>
            <button
              onClick={resetAll}
              className="flex items-center gap-2 text-sm text-posterita-blue hover:underline"
            >
              <RefreshCw size={14} />
              Import Another
            </button>
          </div>

          {/* Store Info Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-posterita-blue/10 rounded-lg flex items-center justify-center">
                <Store size={20} className="text-posterita-blue" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {setup.store_name || businessName}
                </h3>
                <p className="text-sm text-gray-500">
                  {setup.store_description}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {setup.address && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={14} className="text-gray-400" />
                  {setup.address}, {setup.city}
                </div>
              )}
              {setup.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  {setup.phone}
                </div>
              )}
              {setup.opening_hours && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={14} className="text-gray-400" />
                  {setup.opening_hours}
                </div>
              )}
              {setup.tax_rate > 0 && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Tag size={14} className="text-gray-400" />
                  {setup.tax_name} {setup.tax_rate}%
                </div>
              )}
            </div>
          </div>

          {/* Save confirmation */}
          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 flex items-center gap-3">
              <Check size={20} className="text-green-600" />
              <div className="text-sm text-green-800">
                <span className="font-medium">Saved to your account:</span>{" "}
                {saved.products_created} products, {saved.categories_created}{" "}
                new categories
                {saved.stores_created > 0 &&
                  `, ${saved.stores_created} store locations`}
              </div>
            </div>
          )}

          {/* Multi-store info */}
          {setup.stores?.length > 1 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-4">
              <h4 className="font-medium text-blue-900 mb-2">
                {setup.stores.length} Store Locations Found
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {setup.stores.map((store: any, i: number) => (
                  <div
                    key={i}
                    className="text-sm text-blue-800 flex items-center gap-2"
                  >
                    <MapPin size={12} />
                    <span className="font-medium">{store.store_name}</span>
                    {store.address && (
                      <span className="text-blue-600">— {store.address}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products by Category */}
          {setup.categories.map((cat, catIdx) => (
            <div
              key={catIdx}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold">
                  {cat.name}{" "}
                  <span className="text-gray-500 font-normal text-sm">
                    ({cat.products.length} products)
                  </span>
                </h3>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Price</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.products.map((p: any, i: number) => (
                    <tr key={i}>
                      <td>
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package size={16} className="text-gray-400" />
                            </div>
                          )}
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="text-right font-medium whitespace-nowrap">
                        {formatCurrency(p.price, setup.currency)}
                      </td>
                      <td className="text-gray-500 text-sm max-w-xs truncate">
                        {p.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ── Error bar (shown outside processing) ── */}
      {error && step !== "processing" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function formatCurrency(amount: number, currency: string = "MUR"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "MUR",
      minimumFractionDigits: 2,
    }).format(amount ?? 0);
  } catch {
    return `${currency || "MUR"} ${(amount ?? 0).toFixed(2)}`;
  }
}
