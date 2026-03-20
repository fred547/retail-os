import { useState } from 'react';
import { PROCUREMENT_ITEMS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { FileText, Send, CheckCircle, Clock, DollarSign } from 'lucide-react';

export default function ProcurementScreen() {
  const [tab, setTab] = useState<'pipeline' | 'rfqs' | 'pos'>('pipeline');
  const statusColors: Record<string, string> = { sourcing: 'bg-posterita-amber/10 text-posterita-amber', quoting: 'bg-posterita-blue/10 text-posterita-blue', ordered: 'bg-posterita-green/10 text-posterita-green' };
  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-border">
        {[{ id: 'pipeline', label: 'Pipeline', icon: <Clock size={14} /> }, { id: 'rfqs', label: 'RFQs', icon: <Send size={14} /> }, { id: 'pos', label: 'Purchase Orders', icon: <FileText size={14} /> }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors", tab === t.id ? "text-posterita-blue border-b-2 border-posterita-blue" : "text-muted-foreground")}>{t.icon}{t.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto posterita-scroll p-3">
        {tab === 'pipeline' && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[{ label: 'Sourcing', count: 1, color: 'bg-posterita-amber' }, { label: 'Quoting', count: 1, color: 'bg-posterita-blue' }, { label: 'Ordered', count: 1, color: 'bg-posterita-green' }].map(s => (
                <div key={s.label} className="bg-card rounded-xl border border-border p-3 text-center">
                  <div className={cn("w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center text-white font-bold text-sm", s.color)}>{s.count}</div>
                  <p className="text-[10px] font-bold text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {PROCUREMENT_ITEMS.map(item => (
                <div key={item.id} className="bg-card rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", statusColors[item.status])}>{item.status.toUpperCase()}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{item.vendor}</p>
                  <div className="flex items-center gap-1 mt-1"><DollarSign size={12} className="text-posterita-green" /><span className="text-xs font-extrabold">{item.currency} {item.value.toLocaleString()}</span></div>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === 'rfqs' && (
          <div className="text-center py-8">
            <Send size={32} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm font-bold text-foreground">No pending RFQs</p>
            <p className="text-xs text-muted-foreground mt-1">Create a sourcing requirement to generate RFQs</p>
            <button className="mt-3 bg-posterita-blue text-white font-bold text-sm py-2.5 px-6 rounded-xl">New RFQ</button>
          </div>
        )}
        {tab === 'pos' && (
          <div className="space-y-2">
            {PROCUREMENT_ITEMS.filter(i => i.status === 'ordered').map(item => (
              <div key={item.id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-center gap-2"><CheckCircle size={16} className="text-posterita-green" /><div><p className="text-sm font-bold">{item.title}</p><p className="text-[11px] text-muted-foreground">{item.vendor} \u00b7 PO-2026-001</p></div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
