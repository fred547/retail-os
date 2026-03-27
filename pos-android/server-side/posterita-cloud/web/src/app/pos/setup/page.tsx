"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { initialSync } from "@/lib/offline/seed";
import { setSyncMeta } from "@/lib/offline/db";

/**
 * POS Setup Wizard — first-run configuration for desktop POS.
 * User enters account ID, selects store/terminal, runs initial sync.
 */
export default function PosSetupPage() {
  const [step, setStep] = useState<"credentials" | "syncing" | "done" | "error">("credentials");
  const [accountId, setAccountId] = useState("");
  const [storeId, setStoreId] = useState("1");
  const [terminalId, setTerminalId] = useState("1");
  const [syncProgress, setSyncProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [productCount, setProductCount] = useState(0);

  const handleStart = async () => {
    if (!accountId.trim()) return;
    setStep("syncing");
    setSyncProgress("Connecting to server...");

    try {
      // Save context first
      await setSyncMeta("account_id", accountId.trim());
      await setSyncMeta("store_id", storeId);
      await setSyncMeta("terminal_id", terminalId);

      setSyncProgress("Downloading products, categories, taxes...");
      const result = await initialSync(
        accountId.trim(),
        parseInt(storeId) || 0,
        parseInt(terminalId) || 0,
      );

      if (result.error) {
        setErrorMsg(result.error);
        setStep("error");
        return;
      }

      setProductCount(result.productCount);
      setStep("done");
    } catch (e: any) {
      setErrorMsg(e.message || "Sync failed");
      setStep("error");
    }
  };

  if (step === "syncing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="text-center max-w-sm">
          <RefreshCw size={40} className="text-blue-400 animate-spin mx-auto mb-6" />
          <h1 className="text-xl font-bold text-white mb-2">Setting Up POS</h1>
          <p className="text-gray-400 text-sm">{syncProgress}</p>
          <p className="text-gray-600 text-xs mt-4">This may take a minute for large catalogues</p>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="text-center max-w-sm">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-6" />
          <h1 className="text-xl font-bold text-white mb-2">POS Ready</h1>
          <p className="text-gray-400 text-sm mb-1">
            Loaded {productCount} products into offline storage.
          </p>
          <p className="text-gray-500 text-xs mb-8">
            The POS will sync every 5 minutes and work without internet.
          </p>
          <a
            href="/pos"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition"
          >
            Open POS
          </a>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="text-center max-w-sm">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-6" />
          <h1 className="text-xl font-bold text-white mb-2">Setup Failed</h1>
          <p className="text-red-400 text-sm mb-6">{errorMsg}</p>
          <button
            onClick={() => setStep("credentials")}
            className="bg-gray-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">P</span>
          </div>
          <h1 className="text-xl font-bold text-white">POS Terminal Setup</h1>
          <p className="text-gray-400 text-sm mt-1">Connect to your Posterita account</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Account ID</label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="e.g. my-store-abc123"
              autoFocus
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">Store ID</label>
              <input
                type="number"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1.5">Terminal ID</label>
              <input
                type="number"
                value={terminalId}
                onChange={(e) => setTerminalId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!accountId.trim()}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            Connect &amp; Sync
          </button>

          <p className="text-xs text-gray-600 text-center">
            Find your Account ID in the web console under Settings
          </p>
        </div>
      </div>
    </div>
  );
}
