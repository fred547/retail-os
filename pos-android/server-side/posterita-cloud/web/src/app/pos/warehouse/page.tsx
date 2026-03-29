"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search, ArrowLeft, Package, ClipboardCheck, BarChart3,
  RefreshCw, ChevronDown, ChevronUp, X, Check, AlertTriangle,
  ArrowUpDown,
} from "lucide-react";
import { getOfflineDb, getSyncMeta } from "@/lib/offline/db";
import { isSeeded } from "@/lib/offline/seed";
import { startSyncWorker } from "@/lib/offline/sync-worker";
import { startBarcodeListener, stopBarcodeListener } from "@/lib/pos/barcode-listener";
import { restoreSession, createSession, onLock, resetIdleTimer, isLocked, getSession, unlockSession } from "@/lib/pos/session";
import { useSyncStatus } from "@/lib/offline/use-sync";
import type { Product, ProductCategory, PosUser } from "@/lib/offline/schema";
import LockScreen from "@/components/pos/LockScreen";
import ConnectivityDot from "@/components/pos/ConnectivityDot";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "overview" | "count" | "lookup";
type SortField = "name" | "stock" | "category";
type SortDir = "asc" | "desc";

interface InventoryCount {
  id: string;
  product_id: number;
  product_name: string;
  upc: string | null;
  expected_qty: number;
  counted_qty: number;
  variance: number;
  counted_at: string;
  is_sync: boolean;
}

// Low stock threshold
const LOW_STOCK_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stockColor(qty: number): string {
  if (qty <= 0) return "text-red-400";
  if (qty <= LOW_STOCK_THRESHOLD) return "text-amber-400";
  return "text-green-400";
}

function stockBg(qty: number): string {
  if (qty <= 0) return "bg-red-900/30 border-red-800/50";
  if (qty <= LOW_STOCK_THRESHOLD) return "bg-amber-900/20 border-amber-800/40";
  return "bg-gray-800 border-gray-700";
}

function stockLabel(qty: number): string {
  if (qty <= 0) return "Out of stock";
  if (qty <= LOW_STOCK_THRESHOLD) return "Low stock";
  return "In stock";
}

function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WarehousePage() {
  // State
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [locked, setLocked] = useState(false);
  const [sessionUser, setSessionUser] = useState<string | undefined>(undefined);

  // Quick Count state
  const [countProduct, setCountProduct] = useState<Product | null>(null);
  const [countedQty, setCountedQty] = useState("");
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [countSaved, setCountSaved] = useState(false);
  const [countSearch, setCountSearch] = useState("");

  // Stock Lookup state
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupProduct, setLookupProduct] = useState<Product | null>(null);

  const sync = useSyncStatus();
  const countInputRef = useRef<HTMLInputElement>(null);

  // Category map for display
  const categoryMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const c of categories) {
      m[c.productcategory_id] = c.name || "Uncategorized";
    }
    return m;
  }, [categories]);

  // -----------------------------------------------------------------------
  // Init — load products from IndexedDB
  // -----------------------------------------------------------------------
  useEffect(() => {
    async function init() {
      try {
        const accountId = await getSyncMeta("account_id");
        if (!accountId) { setReady(true); return; }

        const seeded = await isSeeded(accountId);
        if (!seeded) { setReady(true); return; }

        const db = getOfflineDb();
        const [prods, cats] = await Promise.all([
          db.product.toArray().then(p => p.filter(x => x.isactive === "Y" && !x.is_deleted)),
          db.productcategory.toArray().then(c => c.filter(x => x.isactive === "Y")),
        ]);

        setProducts(prods.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        setCategories(cats.sort((a, b) => (a.position || 0) - (b.position || 0)));

        // Load saved counts from IndexedDB sync_meta
        try {
          const savedCounts = await getSyncMeta("warehouse_counts");
          if (savedCounts) setCounts(JSON.parse(savedCounts));
        } catch {
          // no saved counts
        }

        // Session
        const session = restoreSession();
        if (session) {
          setSessionUser(session.userName);
          if (isLocked()) setLocked(true);
        } else {
          setLocked(true);
        }
        onLock(() => setLocked(true));

        startSyncWorker();
        setReady(true);
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error("[Warehouse] init failed:", err);
        fetch("/api/errors/log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag: "WAREHOUSE_INIT", message: `Warehouse init crash: ${err.message}`, stack_trace: err.stack, severity: "ERROR" }),
        }).catch(() => {});
        setReady(true);
      }
    }
    init();

    const resetIdle = () => resetIdleTimer();
    document.addEventListener("pointerdown", resetIdle);
    document.addEventListener("keydown", resetIdle);
    return () => {
      document.removeEventListener("pointerdown", resetIdle);
      document.removeEventListener("keydown", resetIdle);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Barcode listener — routes to current tab context
  // -----------------------------------------------------------------------
  useEffect(() => {
    startBarcodeListener((barcode) => {
      const product = products.find(p => p.upc === barcode);
      if (!product) return;

      if (tab === "count") {
        setCountProduct(product);
        setCountedQty("");
        setTimeout(() => countInputRef.current?.focus(), 100);
      } else if (tab === "lookup") {
        setLookupProduct(product);
        setLookupQuery(barcode);
      } else {
        // overview — jump to lookup
        setTab("lookup");
        setLookupProduct(product);
        setLookupQuery(barcode);
      }
    });
    return () => stopBarcodeListener();
  }, [products, tab]);

  // -----------------------------------------------------------------------
  // Filtered + sorted products for overview
  // -----------------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name?.toLowerCase().includes(q)) ||
        (p.upc?.toLowerCase().includes(q)) ||
        (p.shelf_location?.toLowerCase().includes(q))
      );
    }

    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * (a.name || "").localeCompare(b.name || "");
        case "stock":
          return dir * ((a.quantity_on_hand || 0) - (b.quantity_on_hand || 0));
        case "category":
          return dir * (categoryMap[a.productcategory_id] || "").localeCompare(categoryMap[b.productcategory_id] || "");
        default:
          return 0;
      }
    });
  }, [products, searchQuery, sortField, sortDir, categoryMap]);

  // Stock summary stats
  const stats = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let inStock = 0;
    for (const p of products) {
      const qty = p.quantity_on_hand || 0;
      if (qty <= 0) outOfStock++;
      else if (qty <= LOW_STOCK_THRESHOLD) lowStock++;
      else inStock++;
    }
    return { outOfStock, lowStock, inStock, total: products.length };
  }, [products]);

  // -----------------------------------------------------------------------
  // Count handlers
  // -----------------------------------------------------------------------

  const saveCount = useCallback(async () => {
    if (!countProduct || countedQty === "") return;

    const qty = parseFloat(countedQty);
    if (isNaN(qty) || qty < 0) return;

    const expected = countProduct.quantity_on_hand || 0;
    const newCount: InventoryCount = {
      id: makeId(),
      product_id: countProduct.product_id,
      product_name: countProduct.name || "Unknown",
      upc: countProduct.upc,
      expected_qty: expected,
      counted_qty: qty,
      variance: qty - expected,
      counted_at: new Date().toISOString(),
      is_sync: false,
    };

    const updated = [newCount, ...counts];
    setCounts(updated);

    // Persist to IndexedDB via sync_meta
    const { setSyncMeta: setMeta } = await import("@/lib/offline/db");
    await setMeta("warehouse_counts", JSON.stringify(updated));

    setCountProduct(null);
    setCountedQty("");
    setCountSaved(true);
    setTimeout(() => setCountSaved(false), 2000);
  }, [countProduct, countedQty, counts]);

  const clearCount = useCallback((id: string) => {
    const updated = counts.filter(c => c.id !== id);
    setCounts(updated);
    import("@/lib/offline/db").then(({ setSyncMeta: setMeta }) => {
      setMeta("warehouse_counts", JSON.stringify(updated));
    });
  }, [counts]);

  // -----------------------------------------------------------------------
  // Lookup search
  // -----------------------------------------------------------------------
  const lookupResults = useMemo(() => {
    if (!lookupQuery.trim()) return [];
    const q = lookupQuery.toLowerCase();
    return products.filter(p =>
      (p.name?.toLowerCase().includes(q)) ||
      (p.upc?.toLowerCase().includes(q)) ||
      (p.shelf_location?.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [products, lookupQuery]);

  // Count search results
  const countSearchResults = useMemo(() => {
    if (!countSearch.trim()) return [];
    const q = countSearch.toLowerCase();
    return products.filter(p =>
      (p.name?.toLowerCase().includes(q)) ||
      (p.upc?.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [products, countSearch]);

  // Toggle sort direction or change field
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleUnlock = async (user: PosUser) => {
    const session = getSession();
    if (session) {
      unlockSession();
    } else {
      await createSession(user);
    }
    setSessionUser(user.firstname || user.username || "Staff");
    setLocked(false);
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <RefreshCw size={32} className="text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading Warehouse...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Warehouse Not Set Up</h1>
          <p className="text-gray-400 text-sm mb-6">
            Connect this terminal and sync your product catalogue to use warehouse features.
          </p>
          <a href="/pos/setup" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition">
            Set Up POS
          </a>
          <a href="/pos" className="block text-gray-500 text-sm mt-4 hover:text-gray-300 transition">
            Go to POS
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* PIN lock */}
      {locked && <LockScreen userName={sessionUser} onUnlock={handleUnlock} />}

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <a href="/pos" className="text-gray-400 hover:text-gray-200 p-1.5 hover:bg-gray-800 rounded-lg transition">
          <ArrowLeft size={18} />
        </a>
        <span className="text-sm font-semibold text-white">Warehouse</span>

        {/* Sync indicator */}
        {sync.state !== "idle" && sync.state !== "complete" && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <RefreshCw size={12} className={sync.state === "error" ? "text-red-400" : "animate-spin text-blue-400"} />
            {sync.message}
          </span>
        )}

        <div className="flex-1" />

        {/* Pending counts badge */}
        {counts.filter(c => !c.is_sync).length > 0 && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <ClipboardCheck size={14} />
            {counts.filter(c => !c.is_sync).length} pending counts
          </span>
        )}

        <ConnectivityDot />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-800 px-4">
        {([
          { id: "overview" as Tab, label: "Stock Overview", Icon: BarChart3 },
          { id: "count" as Tab, label: "Quick Count", Icon: ClipboardCheck },
          { id: "lookup" as Tab, label: "Stock Lookup", Icon: Search },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              tab === t.id
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <t.Icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">

        {/* ============= STOCK OVERVIEW ============= */}
        {tab === "overview" && (
          <div className="h-full flex flex-col">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-3">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Total Products</p>
                <p className="text-lg font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-3">
                <p className="text-xs text-green-500 mb-1">In Stock</p>
                <p className="text-lg font-bold text-green-400">{stats.inStock}</p>
              </div>
              <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-3">
                <p className="text-xs text-amber-500 mb-1">Low Stock</p>
                <p className="text-lg font-bold text-amber-400">{stats.lowStock}</p>
              </div>
              <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-3">
                <p className="text-xs text-red-500 mb-1">Out of Stock</p>
                <p className="text-lg font-bold text-red-400">{stats.outOfStock}</p>
              </div>
            </div>

            {/* Search + sort controls */}
            <div className="px-4 pb-2 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, barcode, or shelf..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-1">
                {(["name", "stock", "category"] as SortField[]).map(f => (
                  <button
                    key={f}
                    onClick={() => toggleSort(f)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      sortField === f
                        ? "bg-indigo-900/40 text-indigo-400"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {sortField === f && (
                      sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                    {sortField !== f && <ArrowUpDown size={12} className="opacity-40" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-1">
                {filteredProducts.map(p => {
                  const qty = p.quantity_on_hand || 0;
                  return (
                    <div
                      key={p.product_id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition cursor-pointer hover:bg-gray-800/60 ${stockBg(qty)}`}
                      onClick={() => { setTab("lookup"); setLookupProduct(p); setLookupQuery(p.name || ""); }}
                    >
                      {/* Product image or icon */}
                      <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-10 h-10 object-cover" />
                        ) : (
                          <Package size={18} className="text-gray-500" />
                        )}
                      </div>

                      {/* Name + category */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{p.name || "Unnamed"}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {categoryMap[p.productcategory_id] || "Uncategorized"}
                          {p.shelf_location && <span className="ml-2 text-gray-600">Shelf: {p.shelf_location}</span>}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-sm text-gray-300">{p.sellingprice.toFixed(2)}</p>
                      </div>

                      {/* Stock qty */}
                      <div className="text-right min-w-[70px]">
                        <p className={`text-lg font-bold tabular-nums ${stockColor(qty)}`}>{qty}</p>
                        <p className={`text-[10px] font-medium ${stockColor(qty)}`}>{stockLabel(qty)}</p>
                      </div>
                    </div>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <div className="text-center py-12">
                    <Search size={32} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No products match your search.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============= QUICK COUNT ============= */}
        {tab === "count" && (
          <div className="h-full flex flex-col md:flex-row">
            {/* Left: Count input */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="max-w-lg mx-auto space-y-4">
                {/* Scan prompt */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
                  <Package size={40} className="text-indigo-400 mx-auto mb-3" />
                  <p className="text-white font-medium mb-1">Scan a barcode or search for a product</p>
                  <p className="text-gray-500 text-sm">The barcode scanner will automatically detect the product.</p>
                </div>

                {/* Manual search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={countSearch}
                    onChange={(e) => { setCountSearch(e.target.value); setCountProduct(null); }}
                    placeholder="Search by name or barcode..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Search results dropdown */}
                {countSearch.trim() && !countProduct && countSearchResults.length > 0 && (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                    {countSearchResults.map(p => (
                      <button
                        key={p.product_id}
                        onClick={() => {
                          setCountProduct(p);
                          setCountSearch("");
                          setCountedQty("");
                          setTimeout(() => countInputRef.current?.focus(), 100);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition text-left border-b border-gray-700/50 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {p.image ? (
                            <img src={p.image} alt="" className="w-8 h-8 object-cover" />
                          ) : (
                            <Package size={14} className="text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.upc || "No barcode"}</p>
                        </div>
                        <span className={`text-sm font-bold ${stockColor(p.quantity_on_hand || 0)}`}>
                          {p.quantity_on_hand || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Count form — shown when product selected */}
                {countProduct && (
                  <div className="bg-gray-800 border border-indigo-600/50 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {countProduct.image ? (
                          <img src={countProduct.image} alt="" className="w-12 h-12 object-cover" />
                        ) : (
                          <Package size={20} className="text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{countProduct.name}</p>
                        <p className="text-xs text-gray-500">{countProduct.upc || "No barcode"}</p>
                      </div>
                      <button onClick={() => { setCountProduct(null); setCountedQty(""); }} className="text-gray-500 hover:text-gray-300 p-1">
                        <X size={16} />
                      </button>
                    </div>

                    {/* Expected vs counted */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">System Stock</p>
                        <p className={`text-2xl font-bold tabular-nums ${stockColor(countProduct.quantity_on_hand || 0)}`}>
                          {countProduct.quantity_on_hand || 0}
                        </p>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Counted</p>
                        <input
                          ref={countInputRef}
                          type="number"
                          min="0"
                          step="1"
                          value={countedQty}
                          onChange={(e) => setCountedQty(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveCount(); }}
                          placeholder="0"
                          className="w-full bg-transparent text-2xl font-bold text-white tabular-nums outline-none placeholder-gray-700"
                        />
                      </div>
                    </div>

                    {/* Variance display */}
                    {countedQty !== "" && !isNaN(parseFloat(countedQty)) && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        parseFloat(countedQty) - (countProduct.quantity_on_hand || 0) === 0
                          ? "bg-green-900/30 text-green-400"
                          : "bg-amber-900/20 text-amber-400"
                      }`}>
                        {parseFloat(countedQty) - (countProduct.quantity_on_hand || 0) === 0 ? (
                          <Check size={16} />
                        ) : (
                          <AlertTriangle size={16} />
                        )}
                        <span className="text-sm font-medium">
                          Variance: {parseFloat(countedQty) - (countProduct.quantity_on_hand || 0) > 0 ? "+" : ""}
                          {(parseFloat(countedQty) - (countProduct.quantity_on_hand || 0)).toFixed(0)}
                        </span>
                      </div>
                    )}

                    {/* Save button */}
                    <button
                      onClick={saveCount}
                      disabled={countedQty === "" || isNaN(parseFloat(countedQty))}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Save Count
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Count history */}
            <div className="md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-gray-800 flex flex-col">
              <div className="px-4 py-3 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-white">Count History</h3>
                <p className="text-xs text-gray-500">{counts.length} counts recorded</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {counts.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <ClipboardCheck size={32} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No counts yet. Scan a barcode or search to start.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {counts.map(c => (
                      <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{c.product_name}</p>
                          <p className="text-xs text-gray-500">
                            Expected: {c.expected_qty} | Counted: {c.counted_qty}
                          </p>
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${
                          c.variance === 0 ? "text-green-400" : "text-amber-400"
                        }`}>
                          {c.variance > 0 ? "+" : ""}{c.variance}
                        </span>
                        <button onClick={() => clearCount(c.id)} className="text-gray-600 hover:text-red-400 p-1">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============= STOCK LOOKUP ============= */}
        {tab === "lookup" && (
          <div className="h-full overflow-y-auto p-4">
            <div className="max-w-2xl mx-auto w-full space-y-4">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => { setLookupQuery(e.target.value); setLookupProduct(null); }}
                  placeholder="Search by product name, barcode, or shelf location..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              {/* Search results */}
              {lookupQuery.trim() && !lookupProduct && lookupResults.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  {lookupResults.map(p => (
                    <button
                      key={p.product_id}
                      onClick={() => setLookupProduct(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition text-left border-b border-gray-700/50 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-8 h-8 object-cover" />
                        ) : (
                          <Package size={14} className="text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.upc || "No barcode"}</p>
                      </div>
                      <span className={`text-sm font-bold ${stockColor(p.quantity_on_hand || 0)}`}>
                        {p.quantity_on_hand || 0}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {lookupQuery.trim() && !lookupProduct && lookupResults.length === 0 && (
                <div className="text-center py-8">
                  <Search size={28} className="text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No products found.</p>
                </div>
              )}

              {/* Product detail card */}
              {lookupProduct && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-start gap-4 p-4 border-b border-gray-700">
                    <div className="w-20 h-20 rounded-xl bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {lookupProduct.image ? (
                        <img src={lookupProduct.image} alt="" className="w-20 h-20 object-cover" />
                      ) : (
                        <Package size={28} className="text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-white">{lookupProduct.name}</h2>
                      <p className="text-sm text-gray-400">{categoryMap[lookupProduct.productcategory_id] || "Uncategorized"}</p>
                      {lookupProduct.upc && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">{lookupProduct.upc}</p>
                      )}
                    </div>
                    <button onClick={() => setLookupProduct(null)} className="text-gray-500 hover:text-gray-300 p-1">
                      <X size={16} />
                    </button>
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-700">
                    <div className="bg-gray-800 p-4">
                      <p className="text-xs text-gray-500 mb-1">Stock Level</p>
                      <p className={`text-2xl font-bold tabular-nums ${stockColor(lookupProduct.quantity_on_hand || 0)}`}>
                        {lookupProduct.quantity_on_hand || 0}
                      </p>
                      <p className={`text-xs font-medium mt-1 ${stockColor(lookupProduct.quantity_on_hand || 0)}`}>
                        {stockLabel(lookupProduct.quantity_on_hand || 0)}
                      </p>
                    </div>
                    <div className="bg-gray-800 p-4">
                      <p className="text-xs text-gray-500 mb-1">Selling Price</p>
                      <p className="text-2xl font-bold text-white tabular-nums">{lookupProduct.sellingprice.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-800 p-4">
                      <p className="text-xs text-gray-500 mb-1">Cost Price</p>
                      <p className="text-2xl font-bold text-gray-300 tabular-nums">{lookupProduct.costprice.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-800 p-4">
                      <p className="text-xs text-gray-500 mb-1">Reorder Point</p>
                      <p className="text-2xl font-bold text-gray-300 tabular-nums">{lookupProduct.reorder_point || 0}</p>
                    </div>
                  </div>

                  {/* Additional info */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                      <span className="text-sm text-gray-400">Shelf Location</span>
                      <span className="text-sm text-white font-medium">{lookupProduct.shelf_location || "Not assigned"}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                      <span className="text-sm text-gray-400">Track Stock</span>
                      <span className={`text-sm font-medium ${lookupProduct.track_stock ? "text-green-400" : "text-gray-500"}`}>
                        {lookupProduct.track_stock ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                      <span className="text-sm text-gray-400">Serialized</span>
                      <span className={`text-sm font-medium ${lookupProduct.is_serialized === "Y" ? "text-indigo-400" : "text-gray-500"}`}>
                        {lookupProduct.is_serialized === "Y" ? "Yes" : "No"}
                      </span>
                    </div>
                    {lookupProduct.batch_number && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                        <span className="text-sm text-gray-400">Batch</span>
                        <span className="text-sm text-white font-mono">{lookupProduct.batch_number}</span>
                      </div>
                    )}
                    {lookupProduct.expiry_date && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                        <span className="text-sm text-gray-400">Expiry</span>
                        <span className="text-sm text-white">{new Date(lookupProduct.expiry_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {lookupProduct.updated_at && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-400">Last Updated</span>
                        <span className="text-sm text-gray-500">{new Date(lookupProduct.updated_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick count button */}
                  <div className="p-4 border-t border-gray-700">
                    <button
                      onClick={() => {
                        setTab("count");
                        setCountProduct(lookupProduct);
                        setCountedQty("");
                        setTimeout(() => countInputRef.current?.focus(), 200);
                      }}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                    >
                      <ClipboardCheck size={16} />
                      Count This Product
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!lookupQuery.trim() && !lookupProduct && (
                <div className="text-center py-16">
                  <Search size={48} className="text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400 font-medium mb-1">Scan or search for a product</p>
                  <p className="text-gray-600 text-sm">View stock levels, shelf location, pricing, and more.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Count saved toast */}
      {countSaved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <Check size={18} />
          Count saved
        </div>
      )}
    </div>
  );
}
