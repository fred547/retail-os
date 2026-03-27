"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Home, RefreshCw, DollarSign, Printer } from "lucide-react";
import { getOfflineDb, getSyncMeta } from "@/lib/offline/db";
import { isSeeded } from "@/lib/offline/seed";
import { startSyncWorker } from "@/lib/offline/sync-worker";
import { setTaxMap, addProduct, restoreCart } from "@/lib/pos/cart-store";
import { useCart } from "@/lib/pos/use-cart";
import { useSyncStatus } from "@/lib/offline/use-sync";
import { completeOrder } from "@/lib/pos/complete-order";
import { startBarcodeListener, stopBarcodeListener } from "@/lib/pos/barcode-listener";
import { getActiveTill } from "@/lib/pos/till-service";
import { buildReceipt } from "@/lib/pos/escpos";
import { printReceipt, getPrinterConfig } from "@/lib/pos/network-print";
import { saveCartAsQuote } from "@/lib/pos/save-quote";
import { checkIntegrity } from "@/lib/offline/integrity";
import { restoreSession, createSession, lockSession, unlockSession, onLock, resetIdleTimer, isLocked, getSession } from "@/lib/pos/session";
import type { Product, ProductCategory, PosUser } from "@/lib/offline/schema";
import CategoryBar from "@/components/pos/CategoryBar";
import ProductGrid from "@/components/pos/ProductGrid";
import Cart from "@/components/pos/Cart";
import PaymentDialog from "@/components/pos/PaymentDialog";
import TillDialog from "@/components/pos/TillDialog";
import PrinterSetup from "@/components/pos/PrinterSetup";
import LockScreen from "@/components/pos/LockScreen";
import ConnectivityDot from "@/components/pos/ConnectivityDot";

/**
 * POS Checkout — mirrors Android TillActivity.
 * All data from IndexedDB. Works fully offline.
 */
export default function PosPage() {
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [showTill, setShowTill] = useState(false);
  const [showPrinter, setShowPrinter] = useState(false);
  const [tillOpen, setTillOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [sessionUser, setSessionUser] = useState<string | undefined>(undefined);
  const [orderComplete, setOrderComplete] = useState<{ orderId: number; uuid: string } | null>(null);
  const [quoteComplete, setQuoteComplete] = useState<{ documentNo: string } | null>(null);

  const cart = useCart();
  const sync = useSyncStatus();

  // Build qty map for badge display on product grid
  const qtyMap = useMemo(() => {
    const m: Record<number, number> = {};
    for (const item of cart.items) m[item.product_id] = item.qty;
    return m;
  }, [cart.items]);

  // Load data from IndexedDB on mount
  useEffect(() => {
    async function init() {
      const accountId = await getSyncMeta("account_id");
      if (!accountId) {
        // Not set up yet — redirect to setup
        window.location.href = "/pos/setup";
        return;
      }

      const seeded = await isSeeded(accountId);
      if (!seeded) {
        window.location.href = "/pos/setup";
        return;
      }

      const db = getOfflineDb();

      // Load products and categories from IndexedDB
      const [prods, cats, taxes] = await Promise.all([
        db.product.where("isactive").equals("Y").toArray(),
        db.productcategory.where("isactive").equals("Y").toArray(),
        db.tax.toArray(),
      ]);

      setProducts(prods.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      setCategories(cats.sort((a, b) => (a.position || 0) - (b.position || 0)));
      setTaxMap(taxes);
      restoreCart();

      // Run integrity checks
      const integrity = await checkIntegrity();
      if (integrity.fixed.length > 0) {
        console.log("[POS] Integrity fixes applied:", integrity.fixed);
      }

      // Restore or require session (PIN login)
      const session = restoreSession();
      if (session) {
        setSessionUser(session.userName);
        if (isLocked()) {
          setLocked(true);
        }
      } else {
        // No session — require PIN login
        setLocked(true);
      }

      // Register idle lock callback
      onLock(() => setLocked(true));

      // Check till status
      const activeTill = await getActiveTill();
      setTillOpen(!!activeTill);

      // Start background sync
      startSyncWorker();

      setReady(true);
    }
    init();

    // Reset idle timer on user interaction
    const resetIdle = () => resetIdleTimer();
    document.addEventListener("pointerdown", resetIdle);
    document.addEventListener("keydown", resetIdle);
    return () => {
      document.removeEventListener("pointerdown", resetIdle);
      document.removeEventListener("keydown", resetIdle);
    };
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== null) {
      filtered = filtered.filter((p) => p.productcategory_id === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        (p.name?.toLowerCase().includes(q)) ||
        (p.upc?.toLowerCase().includes(q)) ||
        (p.description?.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  // USB barcode scanner listener
  useEffect(() => {
    startBarcodeListener((barcode) => {
      const product = products.find((p) => p.upc === barcode);
      if (product) {
        addProduct(product);
      }
    });
    return () => stopBarcodeListener();
  }, [products]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "F2" && cart.items.length > 0) { e.preventDefault(); setShowPayment(true); }
      if (e.key === "F3") { e.preventDefault(); setShowTill(true); }
      if (e.key === "Escape" && showPayment) { e.preventDefault(); setShowPayment(false); }
      if (e.key === "Escape" && showTill) { e.preventDefault(); setShowTill(false); }
      if (e.key === "F1") { e.preventDefault(); document.getElementById("pos-search")?.focus(); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [cart.items.length, showPayment]);

  const handlePaymentComplete = useCallback(async (payments: any[]) => {
    // Capture cart state before clearing
    const cartSnapshot = { ...cart, items: [...cart.items] };
    const result = await completeOrder(payments);
    setShowPayment(false);
    setOrderComplete(result);
    setTimeout(() => setOrderComplete(null), 3000);

    // Auto-print receipt if printer configured (fire-and-forget)
    if (getPrinterConfig()) {
      try {
        const storeName = (await getSyncMeta("store_name")) || "Posterita POS";
        const receiptData = buildReceipt({
          storeName,
          dateOrdered: new Date().toISOString(),
          items: cartSnapshot.items.map((i) => ({
            name: i.name, qty: i.qty, price: i.price, lineTotal: i.line_total,
          })),
          subtotal: cartSnapshot.subtotal,
          taxTotal: cartSnapshot.tax_total,
          grandTotal: cartSnapshot.grand_total,
          tips: cartSnapshot.tips,
          payments: payments.map((p) => ({
            type: p.type, amount: p.amount, tendered: p.tendered, change: p.change,
          })),
          customerName: cartSnapshot.customer_name || undefined,
          orderUuid: result.uuid,
        });
        printReceipt(receiptData).catch(() => { /* silent — don't block POS for print errors */ });
      } catch { /* silent */ }
    }
  }, [cart]);

  // Loading state
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <RefreshCw size={32} className="text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading POS...</p>
        </div>
      </div>
    );
  }

  // Handle PIN unlock
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

  return (
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* PIN lock screen overlay */}
      {locked && (
        <LockScreen
          userName={sessionUser}
          onUnlock={handleUnlock}
        />
      )}
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <a href="/" className="text-gray-400 hover:text-gray-200 p-1">
          <Home size={18} />
        </a>
        <span className="text-sm font-semibold text-white">POS</span>

        {/* Sync indicator */}
        {sync.state !== "idle" && sync.state !== "complete" && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <RefreshCw size={12} className={sync.state === "error" ? "text-red-400" : "animate-spin text-blue-400"} />
            {sync.message}
          </span>
        )}
        {(sync.pendingOrders > 0 || sync.pendingTills > 0) && (
          <span className="text-xs text-amber-400">
            {sync.pendingOrders > 0 && `${sync.pendingOrders} orders pending`}
          </span>
        )}

        <div className="flex-1" />

        {/* Till button */}
        <button
          onClick={() => setShowTill(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            tillOpen
              ? "bg-green-900/40 text-green-400 hover:bg-green-900/60"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          <DollarSign size={14} />
          {tillOpen ? "Till Open" : "Open Till"}
        </button>

        {/* Printer button */}
        <button
          onClick={() => setShowPrinter(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            getPrinterConfig()
              ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
              : "bg-amber-900/30 text-amber-400 hover:bg-amber-900/50"
          }`}
        >
          <Printer size={14} />
          {getPrinterConfig() ? "Printer" : "No Printer"}
        </button>

        {/* Keyboard shortcuts hint */}
        <span className="text-xs text-gray-600 hidden md:block">F1 Search | F2 Pay | F3 Till | Esc Cancel</span>

        <ConnectivityDot />
      </div>

      {/* Main content: products (left) + cart (right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Search + category */}
          <div className="px-4 py-3 space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="pos-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products or scan barcode..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <CategoryBar
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <ProductGrid products={filteredProducts} qtyMap={qtyMap} />
          </div>
        </div>

        {/* Right: Cart (fixed width) */}
        <div className="w-80 lg:w-96 border-l border-gray-800 flex flex-col">
          <Cart
            onPay={() => setShowPayment(true)}
            onHold={() => { /* TODO: hold order */ }}
            onQuote={async () => {
              const result = await saveCartAsQuote();
              if (result) {
                setQuoteComplete({ documentNo: result.documentNo });
                setTimeout(() => setQuoteComplete(null), 4000);
              }
            }}
          />
        </div>
      </div>

      {/* Printer setup dialog */}
      {showPrinter && (
        <PrinterSetup onClose={() => setShowPrinter(false)} />
      )}

      {/* Till dialog */}
      {showTill && (
        <TillDialog
          onClose={() => setShowTill(false)}
          onTillChanged={async () => {
            const t = await getActiveTill();
            setTillOpen(!!t);
          }}
        />
      )}

      {/* Payment dialog */}
      {showPayment && (
        <PaymentDialog
          total={cart.grand_total}
          onComplete={handlePaymentComplete}
          onCancel={() => setShowPayment(false)}
        />
      )}

      {/* Order complete toast */}
      {orderComplete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in z-50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          Order complete
        </div>
      )}

      {/* Quote saved toast */}
      {quoteComplete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
          Quote {quoteComplete.documentNo} saved
        </div>
      )}
    </div>
  );
}
