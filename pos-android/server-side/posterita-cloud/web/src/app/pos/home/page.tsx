"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { getOfflineDb, getSyncMeta } from "@/lib/offline/db";
import { useSyncStatus } from "@/lib/offline/use-sync";
import { restoreSession, onLock, resetIdleTimer, isLocked, getSession, createSession, unlockSession } from "@/lib/pos/session";
import { startSyncWorker } from "@/lib/offline/sync-worker";
import ConnectivityDot from "@/components/pos/ConnectivityDot";
import LockScreen from "@/components/pos/LockScreen";
import type { PosUser } from "@/lib/offline/schema";

/** Time-based greeting, mirrors Android HomeActivity */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Format a date string to relative time */
function formatLastSync(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

/** App launcher card definition */
interface AppCard {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
  bgClass: string;
}

const APP_CARDS: AppCard[] = [
  {
    title: "POS",
    subtitle: "Checkout & sales",
    href: "/pos",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    ),
    bgClass: "bg-blue-600",
  },
  {
    title: "Warehouse",
    subtitle: "Stock & inventory",
    href: "/pos/warehouse",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    bgClass: "bg-amber-600",
  },
  {
    title: "CRM",
    subtitle: "Customers & loyalty",
    href: "/pos/crm",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    bgClass: "bg-purple-600",
  },
  {
    title: "Logistics",
    subtitle: "Deliveries & orders",
    href: "/pos/logistics",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    bgClass: "bg-green-600",
  },
  {
    title: "Admin",
    subtitle: "Settings & config",
    href: "/pos/admin",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    bgClass: "bg-gray-600",
  },
  {
    title: "Shifts",
    subtitle: "Clock in & out",
    href: "/pos/shifts",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    bgClass: "bg-teal-600",
  },
  {
    title: "Sync",
    subtitle: "Data & status",
    href: "/pos/sync",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
    bgClass: "bg-cyan-600",
  },
];

export default function PosHomePage() {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [sessionUser, setSessionUser] = useState<string | undefined>(undefined);
  const [brandName, setBrandName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [terminalName, setTerminalName] = useState("");
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currency, setCurrency] = useState("");

  const sync = useSyncStatus();

  useEffect(() => {
    async function init() {
      try {
        const accountId = await getSyncMeta("account_id");
        if (!accountId) {
          // Not set up - redirect to setup
          window.location.href = "/pos/setup";
          return;
        }

        const db = getOfflineDb();

        // Load context from sync_meta and IndexedDB
        const [brand, store, terminal, storeId] = await Promise.all([
          getSyncMeta("brand_name"),
          getSyncMeta("store_name"),
          getSyncMeta("terminal_name"),
          getSyncMeta("store_id"),
        ]);

        setBrandName(brand || "Posterita");
        setStoreName(store || "Store");
        setTerminalName(terminal || "Terminal");

        // Load currency from store
        if (storeId) {
          const storeRecord = await db.store.get(parseInt(storeId));
          if (storeRecord?.currency) setCurrency(storeRecord.currency);
        }

        // Count active products
        const products = await db.product.where("isactive").equals("Y").count();
        setTotalProducts(products);

        // Count today's orders and revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();
        const orders = await db.order.where("date_ordered").aboveOrEqual(todayIso).toArray();
        setTodayOrders(orders.length);
        setTodayRevenue(orders.reduce((sum, o) => sum + (o.grand_total || 0), 0));

        // Restore session
        const session = restoreSession();
        if (session) {
          setSessionUser(session.userName);
          if (isLocked()) {
            setLocked(true);
          }
        } else {
          setLocked(true);
        }

        onLock(() => setLocked(true));

        // Start background sync
        startSyncWorker();

        setReady(true);
      } catch (e: any) {
        console.error("[POS Home] init failed:", e);
        fetch("/api/errors/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tag: "POS_HOME_INIT",
            message: `POS Home init crash: ${e.message}`,
            stack_trace: e.stack,
            severity: "ERROR",
          }),
        }).catch(() => {});
        setReady(true);
      }
    }
    init();

    // Reset idle timer on interaction
    const resetIdle = () => resetIdleTimer();
    document.addEventListener("pointerdown", resetIdle);
    document.addEventListener("keydown", resetIdle);
    return () => {
      document.removeEventListener("pointerdown", resetIdle);
      document.removeEventListener("keydown", resetIdle);
    };
  }, []);

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

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <RefreshCw size={32} className="text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const pendingCount = sync.pendingOrders + sync.pendingTills;

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* PIN lock screen overlay */}
      {locked && (
        <LockScreen userName={sessionUser} onUnlock={handleUnlock} />
      )}

      {/* Header */}
      <header className="px-4 pt-5 pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{brandName}</h1>
            <p className="text-xs text-gray-500 truncate">
              {storeName} &middot; {terminalName}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Sync status dot */}
            <div className="flex items-center gap-1.5">
              {sync.state !== "idle" && sync.state !== "complete" && (
                <RefreshCw
                  size={14}
                  className={
                    sync.state === "error"
                      ? "text-red-400"
                      : "animate-spin text-blue-400"
                  }
                />
              )}
              <ConnectivityDot />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-5">
        {/* Greeting */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">
            {getGreeting()}, {sessionUser || "there"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-800 rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-bold text-white">{todayOrders}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Orders today</p>
          </div>
          <div className="bg-gray-800 rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-bold text-white">
              {currency ? `${currency} ` : ""}
              {todayRevenue.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">Revenue today</p>
          </div>
          <div className="bg-gray-800 rounded-xl px-3 py-3 text-center">
            <p className="text-2xl font-bold text-white">{totalProducts.toLocaleString()}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Products</p>
          </div>
        </div>

        {/* App launcher grid — 2 columns, 3 rows */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {APP_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group flex flex-col items-center gap-2 rounded-2xl p-5 transition hover:scale-[1.02] active:scale-[0.98] bg-gray-800 hover:bg-gray-750"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${card.bgClass}`}
              >
                {card.icon}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">{card.title}</p>
                <p className="text-[11px] text-gray-500">{card.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Sync status bar */}
        <div className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                sync.lastError
                  ? "bg-red-500"
                  : pendingCount > 0
                  ? "bg-amber-500"
                  : "bg-green-500"
              }`}
            />
            <div className="min-w-0">
              <p className="text-xs text-gray-300 truncate">
                {sync.lastError
                  ? "Sync error"
                  : pendingCount > 0
                  ? `${pendingCount} item${pendingCount === 1 ? "" : "s"} pending sync`
                  : "All synced"}
              </p>
              <p className="text-[10px] text-gray-600">
                Last sync: {formatLastSync(sync.lastSyncAt)}
              </p>
            </div>
          </div>
          <button
            onClick={sync.syncNow}
            disabled={sync.state !== "idle" && sync.state !== "complete" && sync.state !== "error"}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium disabled:text-gray-600 disabled:cursor-not-allowed transition"
          >
            Sync now
          </button>
        </div>
      </main>

      {/* Bottom nav */}
      <PosBottomNav current="home" />
    </div>
  );
}

/** Bottom navigation bar — shared across PWA pages */
export function PosBottomNav({ current }: { current: string }) {
  const items = [
    {
      id: "home",
      label: "Home",
      href: "/pos/home",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: "pos",
      label: "POS",
      href: "/pos",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      ),
    },
    {
      id: "sync",
      label: "Sync",
      href: "/pos/sync",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="flex items-center justify-around border-t border-gray-800 bg-gray-900 px-2 py-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition ${
            current === item.id
              ? "text-blue-400"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
