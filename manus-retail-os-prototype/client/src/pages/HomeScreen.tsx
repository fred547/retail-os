// ============================================================
// Posterita Retail OS — Home / Dashboard Screen
// Warm Workspace · Posterita brand tokens
// Adapts to phone, tablet, and web surfaces
// ============================================================

import { useStore } from '@/lib/store';
import { DASHBOARD_STATS, SALES_CHART_DATA, ROLE_SCREENS, SCREEN_META, formatRs, INVENTORY_ITEMS, DELIVERIES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ShoppingCart, Users, AlertTriangle, Truck, ArrowRight } from 'lucide-react';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663451548677/PzKV5LvJMj7wE6u8i9XDPA/posterita-hero-store-VzzbwhFQb8KJbxRk6X7J6f.webp';

export default function HomeScreen() {
  const { role, surface, navigate } = useStore();
  const screens = ROLE_SCREENS[role] || ROLE_SCREENS.owner;
  const isCompact = surface === 'phone';

  return (
    <div className={cn("min-h-full", isCompact ? "pb-6" : "pb-8")}>
      {/* Hero Banner */}
      <div className="relative h-36 overflow-hidden">
        <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-posterita-blue/90 to-posterita-blue/60" />
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <p className="text-white/80 text-xs font-semibold">Good morning</p>
          <h1 className="text-white text-xl font-extrabold">Port Louis Central</h1>
          <p className="text-white/70 text-[11px] font-medium mt-0.5">Thursday, 19 March 2026</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={cn("px-4 -mt-5 relative z-10", !isCompact && "px-6")}>
        <div className={cn("grid gap-3", isCompact ? "grid-cols-2" : "grid-cols-4")}>
          <KPICard label="Today's Sales" value={formatRs(DASHBOARD_STATS.todaySales)} trend="+12%" trendUp icon={<ShoppingCart size={16} />} color="blue" />
          <KPICard label="Transactions" value={String(DASHBOARD_STATS.todayTransactions)} trend="+3" trendUp icon={<TrendingUp size={16} />} color="green" />
          <KPICard label="Avg Basket" value={formatRs(DASHBOARD_STATS.avgBasket)} trend="-2%" trendUp={false} icon={<ShoppingCart size={16} />} color="amber" />
          <KPICard label="Active Customers" value={String(DASHBOARD_STATS.activeCustomers)} trend="+8 today" trendUp icon={<Users size={16} />} color="teal" />
        </div>
      </div>

      {/* Sales Chart */}
      <div className={cn("mx-4 mt-4 bg-card rounded-xl border border-border p-4", !isCompact && "mx-6")}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-foreground">This Week</h3>
          <span className="text-[11px] font-semibold text-muted-foreground">Sales Trend</span>
        </div>
        <MiniBarChart data={SALES_CHART_DATA} />
      </div>

      {/* Alerts */}
      {(role === 'owner' || role === 'supervisor' || role === 'merchandiser') && (
        <div className={cn("mx-4 mt-4", !isCompact && "mx-6")}>
          <h3 className="text-sm font-extrabold text-foreground mb-2">Alerts</h3>
          <div className="space-y-2">
            {INVENTORY_ITEMS.filter(i => i.status === 'critical').map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-posterita-red/10 rounded-lg px-3 py-2.5 border border-posterita-red/20">
                <AlertTriangle size={16} className="text-posterita-red flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{item.product}</p>
                  <p className="text-[11px] text-posterita-red font-semibold">{item.stock} left — below minimum ({item.min})</p>
                </div>
              </div>
            ))}
            {DELIVERIES.filter(d => d.status === 'in-transit').map(d => (
              <div key={d.id} className="flex items-center gap-3 bg-posterita-blue/10 rounded-lg px-3 py-2.5 border border-posterita-blue/20">
                <Truck size={16} className="text-posterita-blue flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{d.type}</p>
                  <p className="text-[11px] text-posterita-blue font-semibold">{d.from} → {d.to} · ETA {d.eta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className={cn("mx-4 mt-4", !isCompact && "mx-6")}>
        <h3 className="text-sm font-extrabold text-foreground mb-2">Quick Actions</h3>
        <div className={cn("grid gap-2", isCompact ? "grid-cols-3" : "grid-cols-4")}>
          {screens.filter(s => s !== 'home' && s !== 'settings').slice(0, isCompact ? 6 : 8).map(screenId => {
            const meta = SCREEN_META[screenId];
            if (!meta) return null;
            return (
              <button
                key={screenId}
                onClick={() => navigate(screenId)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-posterita-blue/30 hover:bg-posterita-blue-light/50 transition-all group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{meta.icon}</span>
                <span className="text-[11px] font-bold text-foreground text-center leading-tight">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className={cn("mx-4 mt-4", !isCompact && "mx-6")}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-extrabold text-foreground">Recent Activity</h3>
          <button className="text-[11px] font-bold text-posterita-blue flex items-center gap-1">View All <ArrowRight size={12} /></button>
        </div>
        <div className="space-y-2">
          {[
            { time: '14:23', text: 'Sale #1047 — Rs 2,580 (Priya)', type: 'sale' },
            { time: '14:10', text: 'Loyalty signup — Marie Dupont (+500 pts)', type: 'loyalty' },
            { time: '13:45', text: 'Stock alert — Coastal Runner White (3 left)', type: 'alert' },
            { time: '13:20', text: 'Delivery dispatched — Grand Baie Beach', type: 'delivery' },
          ].map((activity, i) => (
            <div key={i} className="flex items-center gap-3 bg-card rounded-lg px-3 py-2.5 border border-border">
              <span className="text-[10px] font-bold text-muted-foreground w-10 flex-shrink-0">{activity.time}</span>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                backgroundColor: activity.type === 'sale' ? '#1976D2' : activity.type === 'loyalty' ? '#388E3C' : activity.type === 'alert' ? '#D32F2F' : '#F57C00'
              }} />
              <p className="text-xs font-semibold text-foreground truncate">{activity.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, trend, trendUp, icon, color }: {
  label: string; value: string; trend: string; trendUp: boolean; icon: React.ReactNode; color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-posterita-blue/10 text-posterita-blue',
    green: 'bg-posterita-green/10 text-posterita-green',
    amber: 'bg-posterita-amber/10 text-posterita-amber',
    teal: 'bg-posterita-teal/10 text-posterita-teal',
  };
  return (
    <div className="bg-card rounded-xl border border-border p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", colorMap[color])}>{icon}</div>
        <div className={cn("flex items-center gap-0.5 text-[10px] font-bold", trendUp ? "text-posterita-green" : "text-posterita-red")}>
          {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{trend}
        </div>
      </div>
      <p className="text-base font-extrabold text-foreground leading-tight">{value}</p>
      <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function MiniBarChart({ data }: { data: typeof SALES_CHART_DATA }) {
  const max = Math.max(...data.map(d => d.sales), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full relative" style={{ height: '80px' }}>
            <div
              className={cn("absolute bottom-0 w-full rounded-t-md transition-all", d.sales > 0 ? "bg-posterita-blue" : "bg-muted")}
              style={{ height: d.sales > 0 ? `${Math.max((d.sales / max) * 100, 8)}%` : '4px' }}
            />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">{d.day}</span>
        </div>
      ))}
    </div>
  );
}
