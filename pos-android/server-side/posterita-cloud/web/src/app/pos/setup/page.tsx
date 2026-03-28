"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Store, Monitor } from "lucide-react";
import { initialSync } from "@/lib/offline/seed";
import { setSyncMeta } from "@/lib/offline/db";

/**
 * POS Setup Wizard — auto-detects account from web session.
 * User selects store + terminal from dropdowns, then syncs.
 */
export default function PosSetupPage() {
  const [step, setStep] = useState<"loading" | "select" | "syncing" | "done" | "error">("loading");
  const [syncProgress, setSyncProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [productCount, setProductCount] = useState(0);

  // Account context (auto-detected from session)
  const [accountId, setAccountId] = useState("");
  const [brandName, setBrandName] = useState("");

  // Store/terminal selection
  const [stores, setStores] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState(0);
  const [selectedTerminal, setSelectedTerminal] = useState(0);

  // Auto-detect account + load stores/terminals on mount
  useEffect(() => {
    async function init() {
      try {
        // Fetch account context from session
        const accRes = await fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "account", select: "account_id, businessname", limit: 1 }),
        });
        const accData = await accRes.json();
        const account = accData.data?.[0];

        if (!account?.account_id) {
          setErrorMsg("Not logged in. Please log in to the web console first.");
          setStep("error");
          return;
        }

        setAccountId(account.account_id);
        setBrandName(account.businessname || account.account_id);

        // Fetch stores
        const storeRes = await fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: "store", select: "store_id, name",
            filters: [{ column: "isactive", op: "eq", value: "Y" }],
            order: { column: "name" },
          }),
        });
        const storeData = await storeRes.json();
        setStores(storeData.data ?? []);

        // Fetch terminals
        const termRes = await fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: "terminal", select: "terminal_id, name, store_id, terminal_type",
            filters: [{ column: "isactive", op: "eq", value: "Y" }],
            order: { column: "name" },
          }),
        });
        const termData = await termRes.json();
        setTerminals(termData.data ?? []);

        // Auto-select first store/terminal
        if (storeData.data?.length) setSelectedStore(storeData.data[0].store_id);
        if (termData.data?.length) setSelectedTerminal(termData.data[0].terminal_id);

        setStep("select");
      } catch (e: any) {
        setErrorMsg(e.message || "Failed to load account data");
        setStep("error");
      }
    }
    init();
  }, []);

  const filteredTerminals = selectedStore
    ? terminals.filter((t) => t.store_id === selectedStore)
    : terminals;

  const handleStart = async () => {
    if (!accountId || !selectedStore || !selectedTerminal) return;
    setStep("syncing");
    setSyncProgress("Connecting to server...");

    try {
      await setSyncMeta("account_id", accountId);
      await setSyncMeta("store_id", selectedStore.toString());
      await setSyncMeta("terminal_id", selectedTerminal.toString());

      setSyncProgress("Downloading products, categories, taxes...");
      const result = await initialSync(accountId, selectedStore, selectedTerminal);

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

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <RefreshCw size={32} className="text-blue-400 animate-spin" />
      </div>
    );
  }

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
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setStep("select")}
              className="bg-gray-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-600 transition"
            >
              Try Again
            </button>
            <a
              href="/customer/products"
              className="bg-gray-800 text-gray-300 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition"
            >
              Back to Console
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Step: select store + terminal
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">P</span>
          </div>
          <h1 className="text-xl font-bold text-white">POS Terminal Setup</h1>
          <p className="text-gray-400 text-sm mt-1">{brandName}</p>
        </div>

        <div className="space-y-4">
          {/* Store selector */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
              <Store size={12} /> Store
            </label>
            {stores.length > 0 ? (
              <select
                value={selectedStore}
                onChange={(e) => {
                  const sid = Number(e.target.value);
                  setSelectedStore(sid);
                  const firstTerm = terminals.find((t) => t.store_id === sid);
                  if (firstTerm) setSelectedTerminal(firstTerm.terminal_id);
                }}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {stores.map((s) => (
                  <option key={s.store_id} value={s.store_id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-amber-400 text-sm">No stores found. Create one in the web console first.</p>
            )}
          </div>

          {/* Terminal selector */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
              <Monitor size={12} /> Terminal
            </label>
            {filteredTerminals.length > 0 ? (
              <select
                value={selectedTerminal}
                onChange={(e) => setSelectedTerminal(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {filteredTerminals.map((t) => (
                  <option key={t.terminal_id} value={t.terminal_id}>
                    {t.name} ({t.terminal_type?.replace("_", " ")})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-amber-400 text-sm">
                No terminals for this store. <a href="/customer/terminals" className="underline">Create one</a> first.
              </p>
            )}
          </div>

          <button
            onClick={handleStart}
            disabled={!selectedStore || !selectedTerminal}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            Connect &amp; Sync
          </button>

          <p className="text-xs text-gray-600 text-center">
            Account: {accountId}
          </p>
        </div>
      </div>
    </div>
  );
}
