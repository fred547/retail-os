import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Package, FileCheck, Camera } from 'lucide-react';

const CONTAINERS = [
  { id: 'cnt1', ref: 'CNT-2026-003', status: 'inspecting', origin: 'Guangzhou', items: 450, arrived: '2026-03-18', vendor: 'Reef International' },
  { id: 'cnt2', ref: 'CNT-2026-002', status: 'costing', origin: 'Ho Chi Minh', items: 280, arrived: '2026-03-15', vendor: 'Island Traders Co.' },
  { id: 'cnt3', ref: 'CNT-2026-001', status: 'released', origin: 'Mumbai', items: 120, arrived: '2026-03-10', vendor: 'Textile House' },
];

export default function WarehouseScreen() {
  const [tab, setTab] = useState<'containers' | 'inspect'>('containers');
  const statusColors: Record<string, string> = { inspecting: 'bg-posterita-amber/10 text-posterita-amber', costing: 'bg-posterita-blue/10 text-posterita-blue', released: 'bg-posterita-green/10 text-posterita-green' };
  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-border">
        {[{ id: 'containers', label: 'Containers', icon: <Package size={14} /> }, { id: 'inspect', label: 'Inspect', icon: <FileCheck size={14} /> }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors", tab === t.id ? "text-posterita-blue border-b-2 border-posterita-blue" : "text-muted-foreground")}>{t.icon}{t.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll p-3">
        {tab === 'containers' && (
          <div className="space-y-2">
            {CONTAINERS.map(c => (
              <div key={c.id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-foreground">{c.ref}</p>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", statusColors[c.status])}>{c.status.toUpperCase()}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{c.vendor} \u00b7 {c.origin}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px]"><span className="font-semibold text-foreground">{c.items} items</span><span className="text-muted-foreground">Arrived {c.arrived}</span></div>
              </div>
            ))}
          </div>
        )}
        {tab === 'inspect' && (
          <div className="text-center py-8">
            <Camera size={32} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm font-bold text-foreground">Scan Package QR</p>
            <p className="text-xs text-muted-foreground mt-1">Scan a package QR code to begin inspection</p>
            <button className="mt-3 bg-posterita-blue text-white font-bold text-sm py-2.5 px-6 rounded-xl">Open Scanner</button>
          </div>
        )}
      </div>
    </div>
  );
}
