"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type CartItem = {
  name: string;
  emoji: string;
  price: number;
  qty: number;
};

type Order = {
  id: number;
  items: CartItem[];
  total: number;
  time: Date;
  status: "pending" | "ready" | "served";
};

type StockLog = {
  product: string;
  from: number;
  to: number;
  orderId: number;
  time: Date;
};

type Product = {
  name: string;
  emoji: string;
  price: number;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  { name: "Burger", emoji: "\uD83C\uDF54", price: 8 },
  { name: "Pizza", emoji: "\uD83C\uDF55", price: 12 },
  { name: "Coffee", emoji: "\u2615", price: 4 },
  { name: "Salad", emoji: "\uD83E\uDD57", price: 9 },
  { name: "Chicken Wings", emoji: "\uD83C\uDF57", price: 10 },
  { name: "Soda", emoji: "\uD83E\uDD64", price: 3 },
  { name: "Ice Cream", emoji: "\uD83C\uDF68", price: 5 },
  { name: "Cake", emoji: "\uD83C\uDF70", price: 8 },
];

const INITIAL_STOCK: Record<string, number> = {
  Burger: 50,
  Pizza: 30,
  Coffee: 80,
  Salad: 25,
  "Chicken Wings": 35,
  Soda: 60,
  "Ice Cream": 40,
  Cake: 20,
};

// ─── Sound Engine (Web Audio API) ───────────────────────────────────────────

function useSoundEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    (freq: number, duration: number, type: OscillatorType = "sine", vol = 0.15) => {
      if (!enabledRef.current) return;
      try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch {
        // Audio not available
      }
    },
    [getCtx]
  );

  const ding = useCallback(() => {
    playTone(880, 0.15, "sine", 0.12);
    setTimeout(() => playTone(1100, 0.2, "sine", 0.08), 80);
  }, [playTone]);

  const whoosh = useCallback(() => {
    playTone(600, 0.12, "sawtooth", 0.06);
    setTimeout(() => playTone(300, 0.15, "sawtooth", 0.03), 60);
  }, [playTone]);

  const alert = useCallback(() => {
    playTone(440, 0.1, "square", 0.05);
    setTimeout(() => playTone(440, 0.1, "square", 0.05), 150);
  }, [playTone]);

  return { ding, whoosh, alert, enabledRef };
}

// ─── Utility ────────────────────────────────────────────────────────────────

function timeAgo(date: Date, now: Date): string {
  const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

// ─── POS Panel ──────────────────────────────────────────────────────────────

function POSPanel({
  cart,
  stock,
  onAddItem,
  onRemoveItem,
  onPay,
  paidFlash,
}: {
  cart: CartItem[];
  stock: Record<string, number>;
  onAddItem: (p: Product) => void;
  onRemoveItem: (name: string) => void;
  onPay: () => void;
  paidFlash: boolean;
}) {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="h-1 bg-blue-500 rounded-t-lg shrink-0" />
      <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2 shrink-0">
        <span className="text-blue-400 text-sm font-semibold tracking-wide uppercase">
          POS Terminal
        </span>
      </div>
      <div className="flex flex-1 min-h-0">
        {/* Product Grid */}
        <div className="flex-1 p-2 overflow-y-auto">
          <div className="grid grid-cols-2 gap-1.5">
            {PRODUCTS.map((p) => {
              const outOfStock = (stock[p.name] ?? 0) <= 0;
              return (
                <button
                  key={p.name}
                  onClick={() => !outOfStock && onAddItem(p)}
                  disabled={outOfStock}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all text-center ${
                    outOfStock
                      ? "bg-gray-800/50 opacity-40 cursor-not-allowed"
                      : "bg-gray-800 hover:bg-gray-700 hover:scale-[1.03] active:scale-95 cursor-pointer"
                  }`}
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="text-xs text-gray-300 mt-0.5 leading-tight">
                    {p.name}
                  </span>
                  <span className="text-xs font-bold text-white">
                    ${p.price}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        <div className="w-[45%] border-l border-gray-800 flex flex-col">
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {cart.length === 0 && (
              <p className="text-gray-600 text-xs text-center mt-4">
                Tap a product to start
              </p>
            )}
            {cart.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between bg-gray-800/60 rounded px-2 py-1 text-xs group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span>{item.emoji}</span>
                  <span className="text-gray-300 truncate">{item.name}</span>
                  <span className="text-gray-500">x{item.qty}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-medium">
                    ${(item.price * item.qty).toFixed(2)}
                  </span>
                  <button
                    onClick={() => onRemoveItem(item.name)}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 p-2 shrink-0">
            <div className="flex justify-between text-sm font-bold text-white mb-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <button
              onClick={onPay}
              disabled={cart.length === 0}
              className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
                paidFlash
                  ? "bg-green-500 text-white scale-95"
                  : cart.length === 0
                  ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white active:scale-95"
              }`}
            >
              {paidFlash ? "\u2713 Paid" : `Pay ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KDS Panel ──────────────────────────────────────────────────────────────

function KDSPanel({
  orders,
  now,
  onBump,
  onRecall,
  lastBumped,
}: {
  orders: Order[];
  now: Date;
  onBump: (id: number) => void;
  onRecall: () => void;
  lastBumped: Order | null;
}) {
  const pending = orders.filter((o) => o.status === "pending");
  const readyCount = orders.filter((o) => o.status === "ready").length;

  function cardColor(order: Order): string {
    const elapsed = (now.getTime() - order.time.getTime()) / 1000;
    if (elapsed > 600) return "border-red-500/60 bg-red-950/30";
    if (elapsed > 300) return "border-yellow-500/50 bg-yellow-950/20";
    return "border-green-500/40 bg-green-950/20";
  }

  function elapsedText(order: Order): string {
    const sec = Math.floor((now.getTime() - order.time.getTime()) / 1000);
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-1 bg-orange-500 rounded-t-lg shrink-0" />
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between shrink-0">
        <span className="text-orange-400 text-sm font-semibold tracking-wide uppercase">
          Kitchen Display
        </span>
        <div className="flex items-center gap-3">
          {lastBumped && (
            <button
              onClick={onRecall}
              className="text-[10px] text-gray-500 hover:text-orange-400 transition-colors"
            >
              Recall
            </button>
          )}
          <span className="text-[10px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded">
            Ready: {readyCount}
          </span>
          <span className="text-[10px] bg-orange-900/50 text-orange-400 px-1.5 py-0.5 rounded">
            Queue: {pending.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {pending.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-sm">All clear - no pending orders</p>
          </div>
        )}
        {pending.map((order) => (
          <div
            key={order.id}
            className={`border rounded-lg p-2.5 transition-all animate-[slideIn_0.3s_ease-out] ${cardColor(order)}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white font-bold text-sm">
                Order #{order.id}
              </span>
              <span className="text-gray-400 text-[10px] font-mono">
                {elapsedText(order)}
              </span>
            </div>
            <div className="space-y-0.5 mb-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-300">
                  <span>{item.emoji}</span>
                  <span>
                    {item.name} x{item.qty}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onBump(order.id)}
              className="w-full py-1 bg-orange-600/80 hover:bg-orange-500 text-white text-xs font-semibold rounded transition-colors active:scale-95"
            >
              Bump
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Manager Dashboard Panel ────────────────────────────────────────────────

function ManagerPanel({
  orders,
  now,
}: {
  orders: Order[];
  now: Date;
}) {
  const orderCount = orders.length;
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const avgOrder = orderCount > 0 ? revenue / orderCount : 0;
  const lastOrder = orders.length > 0 ? orders[orders.length - 1] : null;

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { qty: number; emoji: string }> = {};
    for (const o of orders) {
      for (const item of o.items) {
        if (!map[item.name]) map[item.name] = { qty: 0, emoji: item.emoji };
        map[item.name].qty += item.qty;
      }
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders]);

  // Orders per minute for mini bar chart (last 10 intervals of 60s)
  const bars = useMemo(() => {
    const result: number[] = new Array(10).fill(0);
    const nowMs = now.getTime();
    for (const o of orders) {
      const ago = Math.floor((nowMs - o.time.getTime()) / 60000);
      if (ago < 10) {
        result[9 - ago]++;
      }
    }
    return result;
  }, [orders, now]);

  const maxBar = Math.max(...bars, 1);
  const last5 = orders.slice(-5).reverse();

  return (
    <div className="flex flex-col h-full">
      <div className="h-1 bg-emerald-500 rounded-t-lg shrink-0" />
      <div className="px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="text-emerald-400 text-sm font-semibold tracking-wide uppercase">
          Manager Dashboard
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Orders", value: orderCount.toString(), color: "text-white" },
            { label: "Revenue", value: formatCurrency(revenue), color: "text-emerald-400" },
            { label: "Avg Order", value: formatCurrency(avgOrder), color: "text-blue-400" },
            {
              label: "Last Order",
              value: lastOrder ? timeAgo(lastOrder.time, now) : "-",
              color: "text-gray-400",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 rounded-lg p-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                {stat.label}
              </div>
              <div className={`text-lg font-bold ${stat.color} leading-tight`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Mini Bar Chart */}
        <div>
          <div className="text-[10px] text-gray-500 mb-1">Orders / minute (last 10 min)</div>
          <div className="flex items-end gap-[3px] h-10">
            {bars.map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-emerald-600/60 rounded-t transition-all duration-500"
                style={{ height: `${(v / maxBar) * 100}%`, minHeight: v > 0 ? "3px" : "1px" }}
              />
            ))}
          </div>
        </div>

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 mb-1">Top Products</div>
            <div className="space-y-0.5">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-600 w-3 text-right">{i + 1}</span>
                  <span>{p.emoji}</span>
                  <span className="text-gray-300 flex-1 truncate">{p.name}</span>
                  <span className="text-gray-500">{p.qty} sold</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Feed */}
        {last5.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 mb-1">Recent Orders</div>
            <div className="space-y-0.5">
              {last5.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-xs bg-gray-800/30 rounded px-2 py-1">
                  <span className="text-gray-400">#{o.id}</span>
                  <span className="text-gray-500 text-[10px]">{timeAgo(o.time, now)}</span>
                  <span className="text-white font-medium">{formatCurrency(o.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stock Monitor Panel ────────────────────────────────────────────────────

function StockPanel({
  stock,
  stockLogs,
}: {
  stock: Record<string, number>;
  stockLogs: StockLog[];
}) {
  const lowStockItems = PRODUCTS.filter((p) => (stock[p.name] ?? 0) <= 5 && (stock[p.name] ?? 0) > 0);
  const outOfStockItems = PRODUCTS.filter((p) => (stock[p.name] ?? 0) <= 0);
  const recentLogs = stockLogs.slice(-8).reverse();

  function stockColor(level: number): string {
    if (level <= 0) return "text-red-400 animate-pulse";
    if (level <= 5) return "text-red-400";
    if (level <= 20) return "text-yellow-400";
    return "text-green-400";
  }

  function barWidth(level: number): number {
    const initial = INITIAL_STOCK[PRODUCTS.find(() => true)?.name ?? ""] ?? 80;
    const maxInit = Math.max(...Object.values(INITIAL_STOCK));
    return Math.max(0, Math.min(100, (level / maxInit) * 100));
  }

  function barColor(level: number): string {
    if (level <= 0) return "bg-red-500";
    if (level <= 5) return "bg-red-500";
    if (level <= 20) return "bg-yellow-500";
    return "bg-green-500";
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-1 bg-purple-500 rounded-t-lg shrink-0" />
      <div className="px-3 py-2 border-b border-gray-800 shrink-0">
        <span className="text-purple-400 text-sm font-semibold tracking-wide uppercase">
          Stock Monitor
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {/* Alerts */}
        {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
          <div className="space-y-1">
            {outOfStockItems.map((p) => (
              <div key={p.name} className="bg-red-950/40 border border-red-800/50 rounded px-2 py-1 text-[11px] text-red-400 animate-pulse">
                {p.emoji} {p.name}: OUT OF STOCK
              </div>
            ))}
            {lowStockItems.map((p) => (
              <div key={p.name} className="bg-yellow-950/30 border border-yellow-800/40 rounded px-2 py-1 text-[11px] text-yellow-400">
                {p.emoji} {p.name}: {stock[p.name]} remaining
              </div>
            ))}
          </div>
        )}

        {/* Stock Levels */}
        <div className="space-y-1">
          {PRODUCTS.map((p) => {
            const level = stock[p.name] ?? 0;
            return (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-center">{p.emoji}</span>
                <span className="text-gray-400 w-24 truncate">{p.name}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor(level)}`}
                    style={{ width: `${barWidth(level)}%` }}
                  />
                </div>
                <span className={`w-8 text-right font-mono text-[11px] ${stockColor(level)}`}>
                  {level}
                </span>
              </div>
            );
          })}
        </div>

        {/* Movement Log */}
        {recentLogs.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 mb-1">Stock Movements</div>
            <div className="space-y-0.5">
              {recentLogs.map((log, i) => (
                <div key={i} className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span className="text-gray-600">{log.product}:</span>
                  <span>{log.from}</span>
                  <span className="text-gray-700">&rarr;</span>
                  <span className={log.to <= 5 ? "text-red-400" : "text-gray-400"}>{log.to}</span>
                  <span className="text-gray-700 ml-auto">Order #{log.orderId}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mobile Tab Bar ─────────────────────────────────────────────────────────

function MobileTabBar({
  activeTab,
  onTabChange,
  pendingCount,
  lowStockCount,
}: {
  activeTab: number;
  onTabChange: (tab: number) => void;
  pendingCount: number;
  lowStockCount: number;
}) {
  const tabs = [
    { label: "POS", color: "text-blue-400", activeColor: "bg-blue-500/20 text-blue-400", badge: 0 },
    { label: "KDS", color: "text-orange-400", activeColor: "bg-orange-500/20 text-orange-400", badge: pendingCount },
    { label: "Manager", color: "text-emerald-400", activeColor: "bg-emerald-500/20 text-emerald-400", badge: 0 },
    { label: "Stock", color: "text-purple-400", activeColor: "bg-purple-500/20 text-purple-400", badge: lowStockCount },
  ];

  return (
    <div className="flex bg-gray-900 border-t border-gray-800 shrink-0 lg:hidden">
      {tabs.map((tab, i) => (
        <button
          key={tab.label}
          onClick={() => onTabChange(i)}
          className={`flex-1 py-2.5 text-xs font-medium text-center relative transition-colors ${
            activeTab === i ? tab.activeColor : "text-gray-600"
          }`}
        >
          {tab.label}
          {tab.badge > 0 && (
            <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function MultiTerminalDemo() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({ ...INITIAL_STOCK });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderCounter, setOrderCounter] = useState(0);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [lastBumped, setLastBumped] = useState<Order | null>(null);
  const [paidFlash, setPaidFlash] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [now, setNow] = useState(new Date());
  const [activeTab, setActiveTab] = useState(0);
  const [showTooltips, setShowTooltips] = useState(true);
  const autoPlayRef = useRef(false);
  const sound = useSoundEngine();
  const [soundOn, setSoundOn] = useState(true);

  // Keep sound ref in sync
  useEffect(() => {
    sound.enabledRef.current = soundOn;
  }, [soundOn, sound.enabledRef]);

  // Tick every second for elapsed timers
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Dismiss tooltips on first click
  useEffect(() => {
    if (!showTooltips) return;
    const handler = () => setShowTooltips(false);
    window.addEventListener("click", handler, { once: true });
    return () => window.removeEventListener("click", handler);
  }, [showTooltips]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const addToCart = useCallback(
    (p: Product) => {
      if ((stock[p.name] ?? 0) <= 0) return;
      setCart((prev) => {
        const existing = prev.find((i) => i.name === p.name);
        if (existing) {
          // Check stock allows more
          if (existing.qty >= (stock[p.name] ?? 0)) return prev;
          return prev.map((i) =>
            i.name === p.name ? { ...i, qty: i.qty + 1 } : i
          );
        }
        return [...prev, { name: p.name, emoji: p.emoji, price: p.price, qty: 1 }];
      });
    },
    [stock]
  );

  const removeFromCart = useCallback((name: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === name);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter((i) => i.name !== name);
      return prev.map((i) =>
        i.name === name ? { ...i, qty: i.qty - 1 } : i
      );
    });
  }, []);

  const createOrder = useCallback(
    (items: CartItem[]) => {
      if (items.length === 0) return;

      const nextId = orderCounter + 1;
      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      const order: Order = {
        id: nextId,
        items: [...items],
        total,
        time: new Date(),
        status: "pending",
      };

      setOrderCounter(nextId);
      setOrders((prev) => [...prev, order]);

      // Decrement stock
      setStock((prev) => {
        const next = { ...prev };
        const logs: StockLog[] = [];
        for (const item of items) {
          const from = next[item.name] ?? 0;
          const to = Math.max(0, from - item.qty);
          next[item.name] = to;
          logs.push({ product: item.name, from, to, orderId: nextId, time: new Date() });
        }
        setStockLogs((prevLogs) => [...prevLogs, ...logs]);

        // Check for low stock alerts
        for (const item of items) {
          if ((next[item.name] ?? 0) <= 5) {
            sound.alert();
          }
        }

        return next;
      });

      sound.ding();
      return order;
    },
    [orderCounter, sound]
  );

  const handlePay = useCallback(() => {
    if (cart.length === 0) return;
    createOrder(cart);
    setCart([]);
    setPaidFlash(true);
    setTimeout(() => setPaidFlash(false), 800);
  }, [cart, createOrder]);

  const handleBump = useCallback(
    (id: number) => {
      setOrders((prev) => {
        const order = prev.find((o) => o.id === id);
        if (order) setLastBumped({ ...order, status: "ready" });
        return prev.map((o) =>
          o.id === id ? { ...o, status: "ready" as const } : o
        );
      });
      sound.whoosh();
    },
    [sound]
  );

  const handleRecall = useCallback(() => {
    if (!lastBumped) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === lastBumped.id ? { ...o, status: "pending" as const } : o
      )
    );
    setLastBumped(null);
  }, [lastBumped]);

  const handleReset = useCallback(() => {
    setOrders([]);
    setStock({ ...INITIAL_STOCK });
    setCart([]);
    setOrderCounter(0);
    setStockLogs([]);
    setLastBumped(null);
    setAutoPlay(false);
    autoPlayRef.current = false;
  }, []);

  // ─── Auto-Play ──────────────────────────────────────────────────────────

  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  // Auto-create orders
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      if (!autoPlayRef.current) return;
      // Create random order with 2-4 items
      const numItems = 2 + Math.floor(Math.random() * 3);
      const items: CartItem[] = [];
      const availableProducts = PRODUCTS.filter((p) => (stock[p.name] ?? 0) > 0);
      if (availableProducts.length === 0) return;

      for (let i = 0; i < numItems; i++) {
        const p = availableProducts[Math.floor(Math.random() * availableProducts.length)];
        const existing = items.find((it) => it.name === p.name);
        if (existing) {
          existing.qty += 1;
        } else {
          items.push({ name: p.name, emoji: p.emoji, price: p.price, qty: 1 });
        }
      }
      createOrder(items);
    }, 8000);
    return () => clearInterval(interval);
  }, [autoPlay, stock, createOrder]);

  // Auto-bump oldest order
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      if (!autoPlayRef.current) return;
      setOrders((prev) => {
        const oldest = prev.find((o) => o.status === "pending");
        if (oldest) {
          sound.whoosh();
          setLastBumped({ ...oldest, status: "ready" });
          return prev.map((o) =>
            o.id === oldest.id ? { ...o, status: "ready" as const } : o
          );
        }
        return prev;
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [autoPlay, sound]);

  // ─── Derived values ─────────────────────────────────────────────────────

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const lowStockCount = PRODUCTS.filter(
    (p) => (stock[p.name] ?? 0) > 0 && (stock[p.name] ?? 0) <= 5
  ).length + PRODUCTS.filter((p) => (stock[p.name] ?? 0) <= 0).length;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-950">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">
              Posterita Multi-Terminal Experience
            </h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              See how POS, Kitchen, Management, and Stock work together in real-time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundOn(!soundOn)}
              className="px-2 py-1.5 text-xs rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
              title={soundOn ? "Mute sounds" : "Unmute sounds"}
            >
              {soundOn ? "\uD83D\uDD0A" : "\uD83D\uDD07"}
            </button>
            <button
              onClick={() => {
                setAutoPlay(!autoPlay);
                autoPlayRef.current = !autoPlay;
              }}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                autoPlay
                  ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
            >
              {autoPlay ? "\u23F8 Pause" : "\u25B6 Auto-Play"}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              \uD83D\uDD04 Reset
            </button>
            <a
              href="/demo"
              className="px-3 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors hidden sm:inline-block"
            >
              Try Full Demo &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* Tooltips Overlay */}
      {showTooltips && (
        <div className="fixed inset-0 z-50 pointer-events-none hidden lg:block">
          <div className="absolute top-20 left-[12%] bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-gray-700 animate-bounce">
            <span className="mr-1">\uD83D\uDC46</span> Click products to add them to the cart
          </div>
          <div className="absolute top-20 right-[12%] bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-gray-700 animate-bounce" style={{ animationDelay: "0.2s" }}>
            Watch the kitchen display update instantly
          </div>
          <div className="absolute bottom-[48%] left-[12%] bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-gray-700 animate-bounce" style={{ animationDelay: "0.4s" }}>
            Revenue and stats update in real-time
          </div>
          <div className="absolute bottom-[48%] right-[12%] bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-gray-700 animate-bounce" style={{ animationDelay: "0.6s" }}>
            Stock levels decrement automatically
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-500 text-xs">
            Click anywhere to dismiss
          </div>
        </div>
      )}

      {/* Desktop: 2x2 Grid / Mobile: Single panel */}
      <div className="flex-1 min-h-0">
        {/* Desktop Grid */}
        <div className="hidden lg:grid grid-cols-2 grid-rows-2 h-full gap-px bg-gray-800">
          <div className="bg-gray-900 rounded-tl-lg overflow-hidden">
            <POSPanel
              cart={cart}
              stock={stock}
              onAddItem={addToCart}
              onRemoveItem={removeFromCart}
              onPay={handlePay}
              paidFlash={paidFlash}
            />
          </div>
          <div className="bg-gray-900 rounded-tr-lg overflow-hidden">
            <KDSPanel
              orders={orders}
              now={now}
              onBump={handleBump}
              onRecall={handleRecall}
              lastBumped={lastBumped}
            />
          </div>
          <div className="bg-gray-900 rounded-bl-lg overflow-hidden">
            <ManagerPanel orders={orders} now={now} />
          </div>
          <div className="bg-gray-900 rounded-br-lg overflow-hidden">
            <StockPanel stock={stock} stockLogs={stockLogs} />
          </div>
        </div>

        {/* Mobile: Single panel with tabs */}
        <div className="lg:hidden flex flex-col h-full">
          <div className="flex-1 min-h-0 bg-gray-900 overflow-hidden">
            {activeTab === 0 && (
              <POSPanel
                cart={cart}
                stock={stock}
                onAddItem={addToCart}
                onRemoveItem={removeFromCart}
                onPay={handlePay}
                paidFlash={paidFlash}
              />
            )}
            {activeTab === 1 && (
              <KDSPanel
                orders={orders}
                now={now}
                onBump={handleBump}
                onRecall={handleRecall}
                lastBumped={lastBumped}
              />
            )}
            {activeTab === 2 && <ManagerPanel orders={orders} now={now} />}
            {activeTab === 3 && <StockPanel stock={stock} stockLogs={stockLogs} />}
          </div>
          <MobileTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            pendingCount={pendingCount}
            lowStockCount={lowStockCount}
          />
        </div>
      </div>
    </div>
  );
}
