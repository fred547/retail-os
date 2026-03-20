import { useState } from 'react';
import { useStore } from '@/lib/store';
import { INVENTORY_ITEMS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Search, Package, AlertTriangle, ScanLine } from 'lucide-react';

export default function InventoryScreen() {
  const { surface } = useStore();
  const [tab, setTab] = useState<'stock' | 'count' | 'alerts'>('stock');
  const [searchQ, setSearchQ] = useState('');
  const filtered = INVENTORY_ITEMS.filter(i => !searchQ || i.product.toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-border">
        {[{ id: 'stock', label: 'Stock Levels', icon: <Package size={14} /> }, { id: 'count', label: 'Count', icon: <ScanLine size={14} /> }, { id: 'alerts', label: 'Alerts', icon: <AlertTriangle size={14} /> }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors", tab === t.id ? "text-posterita-blue border-b-2 border-posterita-blue" : "text-muted-foreground")}>{t.icon}{t.label}</button>
        ))}
      </div>
      {tab === 'stock' && (
        <div className="flex-1 overflow-y-auto posterita-scroll p-3">
          <div className="relative mb-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search inventory..." className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-posterita-blue/30" /></div>
          <div className="space-y-2">
            {filtered.map(item => (
              <div key={item.id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div><p className="text-sm font-bold text-foreground">{item.product}</p><p className="text-[11px] text-muted-foreground font-medium">{item.sku}</p></div>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", item.status === 'ok' ? 'bg-posterita-green/10 text-posterita-green' : item.status === 'low' ? 'bg-posterita-amber/10 text-posterita-amber' : 'bg-posterita-red/10 text-posterita-red')}>{item.status.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={cn("h-full rounded-full", item.status === 'ok' ? 'bg-posterita-green' : item.status === 'low' ? 'bg-posterita-amber' : 'bg-posterita-red')} style={{ width: `${Math.min((item.stock / item.max) * 100, 100)}%` }} /></div>
                  <span className="text-xs font-extrabold text-foreground w-8 text-right">{item.stock}</span><span className="text-[10px] text-muted-foreground">/ {item.max}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'count' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-posterita-blue/10 flex items-center justify-center mb-4"><ScanLine size={32} className="text-posterita-blue" /></div>
          <h3 className="text-lg font-extrabold text-foreground mb-1">Start Inventory Count</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">Scan shelf QR codes to begin a full count or spot check.</p>
          <div className="space-y-2 w-full max-w-xs">
            <button className="w-full bg-posterita-blue text-white font-bold text-sm py-3 rounded-xl">Full Count</button>
            <button className="w-full bg-card border border-border text-foreground font-bold text-sm py-3 rounded-xl">Spot Check</button>
          </div>
        </div>
      )}
      {tab === 'alerts' && (
        <div className="flex-1 overflow-y-auto posterita-scroll p-3">
          <div className="space-y-2">
            {INVENTORY_ITEMS.filter(i => i.status !== 'ok').map(item => (
              <div key={item.id} className={cn("rounded-xl border p-3", item.status === 'critical' ? "bg-posterita-red/5 border-posterita-red/20" : "bg-posterita-amber/5 border-posterita-amber/20")}>
                <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className={item.status === 'critical' ? "text-posterita-red" : "text-posterita-amber"} /><span className="text-sm font-bold text-foreground">{item.product}</span></div>
                <p className="text-xs text-muted-foreground ml-5">{item.stock} units remaining (min: {item.min}). {item.status === 'critical' ? 'Reorder urgently.' : 'Consider reordering.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
